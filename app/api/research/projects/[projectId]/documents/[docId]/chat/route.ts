import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { streamChatWithLogging, AI_MODEL, createEmbedding } from '@/lib/ai'
import { READING_PROMPTS } from '@/lib/prompts'
import { similaritySearch } from '@/lib/embedding-utils'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

// 获取问答历史
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    // 获取问答历史
    const chats = await prisma.documentChat.findMany({
      where: { documentId: params.docId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
  }
}

// 提问 - SSE流式响应
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  const encoder = new TextEncoder()

  // 在流开始前获取文档信息并做积分校验
    const document = await prisma.researchDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      include: {
        document: { select: { content: true } },
        project: { 
          select: {
            id: true,
            userId: true,
            user: { select: { name: true } }
          }
        }
      },
    }) as any

    if (!document || !document.document) {
      return NextResponse.json({ error: '文档不存在' }, { status: 404 })
    }

    if (!document.document.content) {
      return NextResponse.json({ error: '文档内容为空，无法问答' }, { status: 400 })
    }

    const creditCheck = await checkCreditsAndConsume(document.project.userId, AI_OPERATION_TYPES.CHAT)
    if (!creditCheck.allowed) {
      // 中文注释：后端统一打点，便于排查文档问答额度不足问题
      console.warn('[credits] insufficient', {
        operationType: AI_OPERATION_TYPES.CHAT,
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
          const { question } = body

          if (!question?.trim()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Question is required' })}\n\n`))
            controller.close()
            return
          }

          // 发送开始消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

          // 获取历史问答
          const historyChats = await prisma.documentChat.findMany({
            where: { documentId: params.docId },
            orderBy: { createdAt: 'asc' },
            take: 10, // 只取最近 10 条
          })

          // 使用 RAG 检索相关片段
          let sources: Array<{ chunkIndex: number; content: string; similarity: number }> = []
          let context = ''
          let usingRag = false

          // 检查文档是否已完成向量化
          const isEmbedded = document.embeddingStatus === 'completed'

        if (isEmbedded) {
          // 使用向量检索
          try {
            const [queryVector] = await createEmbedding([question])
            sources = await similaritySearch(params.docId, queryVector, 5)
            context = sources.map((s) => s.content).join('\n\n---\n\n')
            usingRag = true
          } catch (error) {
            console.error('RAG 检索失败，降级使用全文:', error)
            // 降级：使用全文的前 10000 字符
            context = document.document?.content?.substring(0, 10000) || ''
          }
        } else {
          // 文档未向量化，使用全文的前 10000 字符
          context = document.document?.content?.substring(0, 10000) || ''
        }

        // 构建历史记录
        const historyText = historyChats
          .map((chat) => `用户：${chat.question}\nAI：${chat.answer}`)
          .join('\n\n')

        // 构建提示词
        const systemPrompt = READING_PROMPTS.CHAT_SYSTEM
        const userPrompt = READING_PROMPTS.CHAT_USER(context, historyText, question)

        let fullResponse = ''

        // 使用流式 API
        for await (const chunk of streamChatWithLogging({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }, {
          module: '文献问答',
          userId: document?.project?.userId || undefined,
          userName: document?.project?.user?.name || undefined,
          metadata: {}
        })) {
          fullResponse += chunk
          const message = JSON.stringify({ type: 'chunk', data: chunk })
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        }

        // 保存问答记录
        const chat = await prisma.documentChat.create({
          data: {
            documentId: params.docId,
            question: question.trim(),
            answer: fullResponse,
          },
        })

        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          chatId: chat.id,
          answer: fullResponse,
          sources: sources.map((s) => ({
            chunkIndex: s.chunkIndex,
            similarity: s.similarity,
          })),
          usingRag
        })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('Error asking question:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to ask question'
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
