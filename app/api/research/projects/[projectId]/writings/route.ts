import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AI_MODEL, streamChatWithLogging } from '@/lib/ai'
import { WRITING_PROMPTS } from '@/lib/prompts'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

// 获取写作内容
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const writings = await prisma.researchWriting.findMany({
      where: {
        projectId: params.projectId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(writings)
  } catch (error) {
    console.error('获取写作内容失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 生成或保存写作内容 - SSE流式响应
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const { type, content } = body

    // 验证类型
    const validTypes = ['concept_definition', 'value', 'objective', 'content', 'method', 'process', 'key_problem', 'innovation']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: '无效的类型' }, { status: 400 })
    }

    // 如果有内容（用户编辑后的内容），直接保存（非流式）
    if (content) {
      const writing = await prisma.researchWriting.upsert({
        where: {
          projectId_type: {
            projectId: params.projectId,
            type,
          },
        },
        update: {
          content,
        },
        create: {
          projectId: params.projectId,
          type,
          content,
        },
      })

      return NextResponse.json(writing)
    }

    // 没有内容，调用AI生成（SSE流式响应）
    // 先获取项目标题和用户ID
    const project = await prisma.researchProject.findUnique({
      where: { id: params.projectId },
      select: { title: true, userId: true, user: { select: { name: true } } },
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 积分/会员检查
    const creditCheck = await checkCreditsAndConsume(project.userId, AI_OPERATION_TYPES.WRITING)
    if (!creditCheck.allowed) {
      // 中文注释：后端统一打点，便于排查“研究写作”积分不足
      console.warn('[credits] insufficient', {
        operationType: AI_OPERATION_TYPES.WRITING,
        userId: project.userId,
        projectId: params.projectId,
        reason: creditCheck.reason ?? '积分不足',
      })
      return NextResponse.json(
        { error: creditCheck.reason ?? '积分不足', code: INSUFFICIENT_CREDITS_CODE },
        { status: 402 }
      )
    }

    // 获取最近一次的文献综述
    const latestOutline = await prisma.researchOutline.findFirst({
      where: { projectId: params.projectId },
      orderBy: { updatedAt: 'desc' },
      select: { content: true },
    })
    const literatureReview = latestOutline?.content ?? undefined

    // 获取相关的前置内容（用于后续模块的生成）
    const existingWritings = await prisma.researchWriting.findMany({
      where: { projectId: params.projectId },
    })
    const getWritingContent = (type: string) => existingWritings.find(w => w.type === type)?.content ?? undefined

    const projectTitle = project.title
    const userId = project.userId
    const userName = project.user?.name
    let systemPrompt = ''
    let userPrompt = ''
    let moduleName = ''

    switch (type) {
      case 'concept_definition':
        systemPrompt = WRITING_PROMPTS.CONCEPT_DEFINITION_SYSTEM
        userPrompt = WRITING_PROMPTS.CONCEPT_DEFINITION_USER(projectTitle)
        moduleName = '核心概念界定生成'
        break
      case 'value':
        systemPrompt = WRITING_PROMPTS.VALUE_SYSTEM
        userPrompt = WRITING_PROMPTS.VALUE_USER(projectTitle, literatureReview)
        moduleName = '研究价值生成'
        break
      case 'objective':
        systemPrompt = WRITING_PROMPTS.OBJECTIVE_SYSTEM
        userPrompt = WRITING_PROMPTS.OBJECTIVE_USER(projectTitle, literatureReview)
        moduleName = '研究目标生成'
        break
      case 'content':
        systemPrompt = WRITING_PROMPTS.CONTENT_SYSTEM
        userPrompt = WRITING_PROMPTS.CONTENT_USER(projectTitle, literatureReview)
        moduleName = '研究内容生成'
        break
      case 'method':
        systemPrompt = WRITING_PROMPTS.METHOD_SYSTEM
        const literatureMethods = latestOutline?.content ?? undefined
        userPrompt = WRITING_PROMPTS.METHOD_USER(projectTitle, literatureMethods)
        moduleName = '研究方法生成'
        break
      case 'process':
        systemPrompt = WRITING_PROMPTS.PROCESS_SYSTEM
        userPrompt = WRITING_PROMPTS.PROCESS_USER(
          projectTitle,
          getWritingContent('objective'),
          getWritingContent('content'),
          getWritingContent('method')
        )
        moduleName = '研究过程生成'
        break
      case 'key_problem':
        systemPrompt = WRITING_PROMPTS.KEY_PROBLEM_SYSTEM
        userPrompt = WRITING_PROMPTS.KEY_PROBLEM_USER(projectTitle, getWritingContent('content'))
        moduleName = '关键问题生成'
        break
      case 'innovation':
        systemPrompt = WRITING_PROMPTS.INNOVATION_SYSTEM
        userPrompt = WRITING_PROMPTS.INNOVATION_USER(projectTitle, literatureReview)
        moduleName = '创新点生成'
        break
    }

    // 创建流式编码器
    const encoder = new TextEncoder()

    // 创建 SSE 流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

          let fullResponse = ''

          // 使用流式 API
          for await (const chunk of streamChatWithLogging(
            {
              model: AI_MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.7,
            },
            { module: moduleName, userId, userName }
          )) {
            fullResponse += chunk
            const message = JSON.stringify({ type: 'chunk', data: chunk })
            controller.enqueue(encoder.encode(`data: ${message}\n\n`))
          }

          // 保存到数据库
          await prisma.researchWriting.upsert({
            where: {
              projectId_type: {
                projectId: params.projectId,
                type,
              },
            },
            update: {
              content: fullResponse,
            },
            create: {
              projectId: params.projectId,
              type,
              content: fullResponse,
            },
          })

          // 发送完成消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('流式生成失败:', error)
          const errorMessage = error instanceof Error ? error.message : '生成失败'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`))
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('生成写作内容失败:', error)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
