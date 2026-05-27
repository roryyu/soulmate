import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AI_MODEL, streamChatWithLogging } from '@/lib/ai'
import { SEARCH_PROMPTS } from '@/lib/prompts'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

/**
 * AI生成CNKI检索式 - SSE流式响应
 * POST /api/research/projects/[projectId]/searches/generate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const encoder = new TextEncoder()

  // 在流开始前获取项目信息并做积分校验
  const project = await prisma.researchProject.findUnique({
    where: { id: params.projectId },
    include: { user: { select: { name: true } } },
  })

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }

  const creditCheck = await checkCreditsAndConsume(project.userId, AI_OPERATION_TYPES.SEARCH)
  if (!creditCheck.allowed) {
    // 中文注释：后端统一打点，便于定位“积分不足”发生在哪个功能入口
    console.warn('[credits] insufficient', {
      operationType: AI_OPERATION_TYPES.SEARCH,
      userId: project.userId,
      projectId: project.id,
      reason: creditCheck.reason ?? '积分不足',
    })
    return NextResponse.json(
      { error: creditCheck.reason ?? '积分不足', code: INSUFFICIENT_CREDITS_CODE },
      { status: 402 }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const data = await request.json()
        const { topic } = data

        if (!topic) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '缺少研究主题' })}\n\n`))
          controller.close()
          return
        }

        // 发送开始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

        const prompt = SEARCH_PROMPTS.USER(topic)
        let fullResponse = ''

        // 使用流式 API
        for await (const chunk of streamChatWithLogging(
          {
            model: AI_MODEL,
            messages: [
              {
                role: 'system',
                content: SEARCH_PROMPTS.SYSTEM,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
          },
          { module: 'CNKI检索式生成', userId: project.userId, userName: project.user.name }
        )) {
          fullResponse += chunk
          const message = JSON.stringify({ type: 'chunk', data: chunk })
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        }

        console.log('AI返回的原始内容:', fullResponse)

        // 解析检索式 - 新格式直接返回检索式，兼容旧格式
        let cnkiQuery = topic // 默认使用原始主题
        let explanation = ''

        // 尝试匹配旧格式 "检索式：xxx"
        const legacyMatch = fullResponse.match(/检索式[：:]\s*(.+?)(?:\n|$)/s)
        if (legacyMatch && legacyMatch[1].trim()) {
          cnkiQuery = legacyMatch[1].trim()
          // 尝试提取旧格式的说明
          const explanationMatch = fullResponse.match(/说明[：:]\s*(.+)/s)
          if (explanationMatch && explanationMatch[1].trim()) {
            explanation = explanationMatch[1].trim()
          }
        } else {
          // 新格式：直接取整个响应作为检索式（去除空白）
          const trimmedResponse = fullResponse.trim()
          if (trimmedResponse) {
            cnkiQuery = trimmedResponse
          } else {
            console.warn('未能解析到检索式，使用原始主题作为默认值')
          }
        }

        console.log('解析结果 - cnkiQuery:', cnkiQuery, 'explanation:', explanation)

        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', cnkiQuery, explanation })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('生成检索式错误:', error)
        const errorMessage = error instanceof Error ? error.message : '生成检索式失败'
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
