import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { streamChatWithLogging, AI_MODEL } from '@/lib/ai'
import { READING_PROMPTS } from '@/lib/prompts'
import { getReference } from '@/lib/cnki'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

// 分析文档 - SSE流式响应
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  const encoder = new TextEncoder()

  // 在流开始前获取文档信息并做积分校验
  const document = await prisma.researchDocument.findFirst({
    where: { id: params.docId, projectId: params.projectId },
    include: {
      document: { select: { content: true, status: true } },
      project: { include: { user: { select: { name: true } } } }
    },
  })

  if (!document || !document.document) {
    return NextResponse.json({ error: '文档不存在' }, { status: 404 })
  }

  if (!document.document.content) {
    return NextResponse.json({ error: '文档内容为空，无法分析' }, { status: 400 })
  }

  const creditCheck = await checkCreditsAndConsume(document.project.userId, AI_OPERATION_TYPES.ANALYZE)
  if (!creditCheck.allowed) {
    // 中文注释：后端统一打点，便于排查文献分析额度不足问题
    console.warn('[credits] insufficient', {
      operationType: AI_OPERATION_TYPES.ANALYZE,
      userId: document.project.userId,
      projectId: params.projectId,
      docId: params.docId,
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
        const body = await request.json()
        const { prompt, focusTopic } = body

        // 发送开始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

        // 使用统一管理的提示词
        const systemPrompt = READING_PROMPTS.ANALYZE_SYSTEM
        const userPrompt = READING_PROMPTS.ANALYZE_USER(document.document!.content!, focusTopic)

        let fullResponse = ''

        // 使用流式 API
        for await (const chunk of streamChatWithLogging({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }, {
          module: '文献分析',
          userId: document?.project?.userId || undefined,
          userName: document?.project?.user?.name || undefined
        })) {
          fullResponse += chunk
          const message = JSON.stringify({ type: 'chunk', data: chunk })
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        }

        let titleAndAuthor = ''
        for await (const chunk of streamChatWithLogging({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `文献内容${document.document!.content!}，获取文档标题和作者，格式为《标题》 - 作者` },
          ],
        }, {
          module: '文献分析',
          userId: document?.project?.userId || undefined,
          userName: document?.project?.user?.name || undefined
        })) {
          titleAndAuthor += chunk
        }
        // 获取知网引用信息
        let reference = await getReference(titleAndAuthor)

        // 保存分析结果 - 直接存储完整 Markdown 内容
        const analysis = await prisma.documentAnalysis.create({
          data: {
            documentId: params.docId,
            prompt: prompt || '标准分析',
            content: fullResponse+reference, // AI 返回的完整 Markdown 内容
          },
        })

        // 更新文档状态
        await prisma.document.update({
          where: { id: document.id },
          data: { status: 'processed' },
        })

        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', analysis })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('Error analyzing document:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze document'
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
