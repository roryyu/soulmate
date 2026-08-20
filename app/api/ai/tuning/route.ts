import { NextRequest, NextResponse } from 'next/server'
import { getAIClient, AI_MODEL, streamChatWithLogging } from '@/lib/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

/**
 * 执行调优后的AI调用
 * POST /api/ai/tuning
 * 支持流式响应：当请求中传入 stream: true 时，返回 SSE 流式响应
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, model, temperature, max_tokens, stream } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '无效的请求参数' },
        { status: 400 }
      )
    }

    // 如果请求指定了流式响应
    if (stream) {
      const encoder = new TextEncoder()

      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            // 发送开始消息
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

            let fullResponse = ''

            // 使用流式 API
            for await (const chunk of streamChatWithLogging({
              model: model || AI_MODEL,
              messages,
              temperature: temperature ?? 0.7,
              max_tokens: max_tokens ?? 4096,
            }, {
              module: 'AI调优-流式'
            })) {
              fullResponse += chunk
              const message = JSON.stringify({ type: 'chunk', data: chunk })
              controller.enqueue(encoder.encode(`data: ${message}\n\n`))
            }

            // 发送完成消息
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', response: fullResponse })}\n\n`))
            controller.close()
          } catch (error) {
            console.error('流式调用错误:', error)
            const errorMessage = error instanceof Error ? error.message : '调用失败'
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`))
            controller.error(error)
          }
        },
      })

      return new NextResponse(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 非流式响应（原有逻辑）
    const startTime = Date.now()

    const completion = await getAIClient().chat.completions.create({
      model: model || AI_MODEL,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 4096,
    })

    const response = completion.choices[0]?.message?.content || ''
    const duration = Date.now() - startTime

    return NextResponse.json({
      response,
      usage: completion.usage,
      duration,
      finish_reason: completion.choices[0]?.finish_reason,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('调优调用错误:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
