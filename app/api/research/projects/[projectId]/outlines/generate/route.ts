import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { streamChatWithLogging, getDefaultModel, createEmbedding } from '@/lib/ai'
import { OUTLINE_PROMPTS } from '@/lib/prompts'
import { similaritySearch } from '@/lib/embedding-utils'
import { checkCreditsAndConsume, AI_OPERATION_TYPES } from '@/lib/credits'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'
import { getLiteratureReviewRagTopK } from '@/lib/system-settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 900 // 设置最大执行时间为 300 秒（5 分钟），支持长文本生成

/**
 * 获取每篇文档的最新智能分析结果
 */
async function getLatestDocumentAnalyses(documentIds: string[]) {
  const analyses = await Promise.all(
    documentIds.map(async (docId) => {
      // 获取每篇文档最新的分析结果（文件名在关联的 Document 表上）
      const latestAnalysis = await prisma.documentAnalysis.findFirst({
        where: { documentId: docId },
        orderBy: { createdAt: 'desc' },
        include: {
          document: {
            select: {
              id: true,
              document: { select: { fileName: true } },
            },
          },
        },
      })
      return latestAnalysis
    })
  )

  // 过滤并映射为提示词所需的结构
  return analyses
    .filter((analysis): analysis is NonNullable<typeof analysis> => analysis !== null)
    .map((a) => ({
      document: {
        id: a.document.id,
        fileName: a.document.document?.fileName ?? '未命名',
      },
      content: a.content,
    }))
}

/**
 * 基于聚焦主题进行跨文档RAG检索
 */
async function searchRelevantChunks(
  documentIds: string[],
  focusTopic: string,
  topK: number = 5
) {
  // 将聚焦主题转化为向量
  const [queryVector] = await createEmbedding([focusTopic])

  // 从所有选中文档中检索相关片段
  const allResults: Array<{
    docId: string
    fileName: string
    chunkIndex: number
    content: string
    similarity: number
  }> = []

  for (const docId of documentIds) {
    try {
      // 检查文档是否已完成向量化
      const document = await prisma.researchDocument.findUnique({
        where: { id: docId },
        select: {
          embeddingStatus: true,
          document: { select: { fileName: true } },
        },
      })

      if (!document || document.embeddingStatus !== 'completed') {
        continue
      }

      // 从该文档中检索相关片段
      const chunks = await similaritySearch(docId, queryVector, topK)
      const fileName = document.document?.fileName ?? '未命名'

      for (const chunk of chunks) {
        allResults.push({
          docId,
          fileName,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          similarity: chunk.similarity,
        })
      }
    } catch (error) {
      console.error(`检索文档 ${docId} 时出错:`, error)
    }
  }

  // 按相似度排序并返回前 topK 个结果
  allResults.sort((a, b) => b.similarity - a.similarity)
  return allResults.slice(0, topK)
}

/**
 * 生成综述大纲 - SSE流式响应
 * POST /api/research/projects/[projectId]/outlines/generate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const encoder = new TextEncoder()

  // 在流开始前获取项目信息并做积分校验
  const projectForCheck = await prisma.researchProject.findUnique({
    where: { id: params.projectId },
    select: { userId: true },
  })

  if (!projectForCheck) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }

  const creditCheck = await checkCreditsAndConsume(projectForCheck.userId, AI_OPERATION_TYPES.OUTLINE)
  if (!creditCheck.allowed) {
    // 中文注释：后端统一打点，便于排查“综述大纲生成”积分不足
    console.warn('[credits] insufficient', {
      operationType: AI_OPERATION_TYPES.OUTLINE,
      userId: projectForCheck.userId,
      projectId: params.projectId,
      reason: creditCheck.reason ?? '积分不足',
    })
    return NextResponse.json(
      { error: creditCheck.reason ?? '积分不足', code: INSUFFICIENT_CREDITS_CODE },
      { status: 402 }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      // 心跳机制：定期发送注释来保持连接活跃，防止超时断开
      const heartbeatInterval = setInterval(() => {
        try {
          // 发送心跳注释（不会被前端解析，但能保持 TCP 连接）
          controller.enqueue(encoder.encode(`: heartbeat

`))
        } catch (error) {
          // 如果发送失败，清除定时器
          clearInterval(heartbeatInterval)
        }
      }, 15000) // 每 15 秒发送一次心跳

      try {
        const data = await request.json()
        const { documentIds, focusTopic } = data

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '请选择至少一篇文献' })}

`))
          controller.close()
          return
        }

        // 获取项目信息（用于记录用户 ID）
        const project = await prisma.researchProject.findUnique({
          where: { id: params.projectId },
          include: { user: { select: { name: true } } },
        })

        // 发送开始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}

`))

        // 中文注释：按选择顺序拉取项目内文献，用于 sourceDocs 与无智能分析时的提示词
        const selectedDocsRows = await prisma.researchDocument.findMany({
          where: { id: { in: documentIds }, projectId: params.projectId },
          select: { id: true, document: { select: { fileName: true } } },
        })
        const docRowById = new Map(
          selectedDocsRows.map((d) => [
            d.id,
            { id: d.id, fileName: d.document?.fileName ?? '未命名' },
          ])
        )
        const selectedDocumentsOrdered = documentIds
          .map((id) => docRowById.get(id))
          .filter((d): d is { id: string; fileName: string } => d !== undefined)

        if (selectedDocumentsOrdered.length === 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: '所选文献不存在或不属于当前项目' })}\n\n`
            )
          )
          controller.close()
          return
        }

        // 1. 获取每篇文档的最新智能分析结果（可无；无则仅靠 RAG 片段与文件名说明继续生成）
        const documentAnalyses = await getLatestDocumentAnalyses(documentIds)

        // 2. 基于聚焦主题进行 RAG 检索（如果有聚焦主题）
        let relevantChunks: Awaited<ReturnType<typeof searchRelevantChunks>> = []
        if (focusTopic && focusTopic.trim()) {
          try {
            // 中文注释：条数来自系统配置（管理后台「系统配置」），默认 30
            const ragTopK = await getLiteratureReviewRagTopK()
            relevantChunks = await searchRelevantChunks(documentIds, focusTopic.trim(), ragTopK)
          } catch (error) {
            console.error('RAG 检索失败:', error)
            // RAG 失败不影响主流程，继续生成
          }
        }

        // 3. 准备文档信息（用于保存 sourceDocs，与勾选列表一致）
        const sourceDocsInfo = selectedDocumentsOrdered.map((d) => ({
          docId: d.id,
          fileName: d.fileName,
        }))

        // 4. 调用 AI 生成综述
        const model = getDefaultModel()
        let fullResponse = ''

        // 使用流式 API
        for await (const chunk of streamChatWithLogging(
          {
            model,
            messages: [
              {
                role: 'system',
                content: OUTLINE_PROMPTS.GENERATE_SYSTEM,
              },
              {
                role: 'user',
                content: OUTLINE_PROMPTS.GENERATE_USER(
                  documentAnalyses,
                  relevantChunks,
                  focusTopic,
                  selectedDocumentsOrdered
                ),
              },
            ],
            temperature: 0.7,
          },
          {
            module: '综述大纲生成',
            userId: project?.userId,
            userName: project?.user?.name,
          }
        )) {
          fullResponse += chunk
          const message = JSON.stringify({ type: 'chunk', data: chunk })
          controller.enqueue(encoder.encode(`data: ${message}

`))
        }

        // AI 返回的是 Markdown 内容，直接保存
        const outlineContent = fullResponse.trim()

        // 从 Markdown 内容中提取第一个标题作为综述标题
        const titleMatch = outlineContent.match(/^#\s+(.+)$/m)
        const outlineTitle = titleMatch ? titleMatch[1].trim() : '文献综述'

        // 保存到数据库
        const outline = await prisma.researchOutline.create({
          data: {
            projectId: params.projectId,
            title: outlineTitle,
            content: outlineContent,
            sourceDocs: JSON.stringify(sourceDocsInfo),
            status: 'draft',
          },
        })

        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          outline: {
            ...outline,
            content: outlineContent,
          }
        })}

`))
        
        // 清除心跳定时器并关闭流
        clearInterval(heartbeatInterval)
        controller.close()
      } catch (error) {
        console.error('生成大纲错误:', error)
        const errorMessage = error instanceof Error ? error.message : '生成大纲失败'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}

`))
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
