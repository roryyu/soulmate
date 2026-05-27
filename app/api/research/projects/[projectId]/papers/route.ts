import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AI_MODEL, streamChatWithLogging } from '@/lib/ai'
import { POLISHING_PROMPTS } from '@/lib/prompts'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

// 获取论文内容
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const paper = await prisma.researchPaper.findUnique({
      where: {
        projectId: params.projectId,
      },
    })

    if (!paper) {
      // 如果不存在，返回空内容
      return NextResponse.json({
        id: null,
        projectId: params.projectId,
        title: '',
        content: '',
        createdAt: null,
        updatedAt: null,
      })
    }

    return NextResponse.json(paper)
  } catch (error) {
    console.error('获取论文内容失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 保存论文内容或处理润色请求 - SSE流式响应
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const { title, content, action, selectedText, removeAIFeatures } = body

    // 处理润色操作
    if (action) {
      // 获取项目信息以获取 userId
      const project = await prisma.researchProject.findUnique({
        where: { id: params.projectId },
        select: { userId: true, user: { select: { name: true } } },
      })

      if (!project) {
        return NextResponse.json({ error: '项目不存在' }, { status: 404 })
      }

      // 积分/会员检查
      const creditCheck = await checkCreditsAndConsume(project.userId, AI_OPERATION_TYPES.POLISHING)
      if (!creditCheck.allowed) {
        // 中文注释：后端统一打点，便于排查“论文润色/降重”积分不足
        console.warn('[credits] insufficient', {
          operationType: AI_OPERATION_TYPES.POLISHING,
          userId: project.userId,
          projectId: params.projectId,
          action,
          reason: creditCheck.reason ?? '积分不足',
        })
        return NextResponse.json(
          { error: creditCheck.reason ?? '积分不足', code: INSUFFICIENT_CREDITS_CODE },
          { status: 402 }
        )
      }

      const userId = project.userId
      const userName = project.user?.name
      const fullContent = content || ''

      let systemPrompt = ''
      let userPrompt = ''
      let moduleName = ''

      switch (action) {
        case 'proofread':
          // 全文审阅
          systemPrompt = POLISHING_PROMPTS.PROOFREAD_SYSTEM
          userPrompt = POLISHING_PROMPTS.PROOFREAD_USER(fullContent, removeAIFeatures || false)
          moduleName = '全文审阅'
          break

        case 'polish':
          // 学术润色
          if (!selectedText) {
            return NextResponse.json({ error: '请先选择要润色的文字' }, { status: 400 })
          }
          systemPrompt = POLISHING_PROMPTS.POLISH_SYSTEM
          userPrompt = POLISHING_PROMPTS.POLISH_USER(fullContent, selectedText, removeAIFeatures || false)
          moduleName = '学术润色'
          break

        case 'expand':
          // 观点扩充
          if (!selectedText) {
            return NextResponse.json({ error: '请先选择要扩充的观点' }, { status: 400 })
          }
          systemPrompt = POLISHING_PROMPTS.EXPAND_SYSTEM
          userPrompt = POLISHING_PROMPTS.EXPAND_USER(fullContent, selectedText, removeAIFeatures || false)
          moduleName = '观点扩充'
          break

        case 'rewrite':
          // 智能降重
          if (!selectedText) {
            return NextResponse.json({ error: '请先选择要降重的文字' }, { status: 400 })
          }
          systemPrompt = POLISHING_PROMPTS.REWRITE_SYSTEM
          userPrompt = POLISHING_PROMPTS.REWRITE_USER(fullContent, selectedText, removeAIFeatures || false)
          moduleName = '智能降重'
          break

        default:
          return NextResponse.json({ error: '无效的操作' }, { status: 400 })
      }

      // 使用流式响应
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 发送开始消息
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

            let fullResponse = ''

            // 根据 action 类型决定是否需要 JSON 输出
            const needsJsonResponse = action === 'proofread'

            // 使用流式 API
            for await (const chunk of streamChatWithLogging(
              {
                model: AI_MODEL,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature: 0.5,
                response_format: needsJsonResponse ? { type: 'json_object' } : undefined,
              },
              { module: moduleName, userId, userName }
            )) {
              fullResponse += chunk
              const message = JSON.stringify({ type: 'chunk', data: chunk })
              controller.enqueue(encoder.encode(`data: ${message}\n\n`))
            }

            // 发送完成消息
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', result: fullResponse })}\n\n`))
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
    }

    // 保存论文内容
    if (content !== undefined) {
      const paper = await prisma.researchPaper.upsert({
        where: {
          projectId: params.projectId,
        },
        update: {
          title: title || null,
          content,
        },
        create: {
          projectId: params.projectId,
          title: title || null,
          content,
        },
      })

      return NextResponse.json(paper)
    }

    return NextResponse.json({ error: '无效请求' }, { status: 400 })
  } catch (error) {
    console.error('处理论文失败:', error)
    return NextResponse.json({ error: '处理失败' }, { status: 500 })
  }
}
