import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AI_MODEL, streamChatWithLogging } from '@/lib/ai'
import { IDEATION_PROMPTS } from '@/lib/prompts'
import { parseLLMJson } from '@/lib/utils/json'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

/**
 * AI生成选题灵感 - SSE流式响应
 * POST /api/research/projects/[projectId]/ideas/generate
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

  // 积分/会员检查：不足则直接返回 402
  const creditCheck = await checkCreditsAndConsume(project.userId, AI_OPERATION_TYPES.IDEATION)
  if (!creditCheck.allowed) {
    // 中文注释：后端统一打点，便于排查“积分不足”的触发频率与入口
    console.warn('[credits] insufficient', {
      operationType: AI_OPERATION_TYPES.IDEATION,
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
        const { keywords } = data

        if (!keywords) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '请输入研究关键词' })}\n\n`))
          controller.close()
          return
        }

        // 发送开始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

        const prompt = IDEATION_PROMPTS.USER(keywords)
        let fullResponse = ''

        // 使用流式 API
        for await (const chunk of streamChatWithLogging(
          {
            model: AI_MODEL,
            messages: [
              {
                role: 'system',
                content: IDEATION_PROMPTS.SYSTEM,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.8,
            response_format: { type: 'json_object' },
          },
          { module: '选题灵感生成', userId: project.userId, userName: project.user.name }
        )) {
          fullResponse += chunk
          const message = JSON.stringify({ type: 'chunk', data: chunk })
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        }

        // 解析返回的 JSON 选题列表
        let ideas: Array<{ title: string; rationale: string }> = []
        try {
          // 使用专门的 LLM JSON 解析器处理带格式的 JSON
          const parsed = parseLLMJson<Array<{ title: string; rationale: string }>>(fullResponse)
          ideas = (Array.isArray(parsed) ? parsed : []).slice(0, 5)
        } catch (error) {
          console.warn('JSON 解析失败，使用回退方案:', error)
          // 解析失败，回退到旧的解析方式
          ideas = fullResponse
            .split('\n')
            .map((line) => line.replace(/^\d+[.、]\s*/, '').trim())
            .filter((line) => line.length > 0)
            .slice(0, 5)
            .map((title) => ({ title, rationale: '基于您的想法生成的选题' }))
        }

        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', ideas })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('生成选题灵感错误:', error)
        const errorMessage = error instanceof Error ? error.message : '生成选题灵感失败'
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
