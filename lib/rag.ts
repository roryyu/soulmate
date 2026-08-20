import { prisma } from '@/lib/prisma'
import { createEmbedding } from '@/lib/ai'
import { similaritySearch } from './embedding-utils'

/**
 * RAG 问答结果
 */
export interface RAGResult {
  answer: string
  sources: Array<{
    chunkIndex: number
    content: string
    similarity: number
  }>
}

/**
 * 使用 RAG 方式进行文档问答
 * @param documentId 文档ID
 * @param question 用户问题
 * @param historyChats 历史对话（用于上下文）
 * @returns RAG 结果（回答 + 引用来源）
 */
export async function ragChat(
  documentId: string,
  question: string,
  historyChats: Array<{ question: string; answer: string }> = []
): Promise<RAGResult> {
  // 1. 获取文献速读记录及关联的原始文档正文（content 在 Document 表）
  const document = await prisma.researchDocument.findUnique({
    where: { id: documentId },
    select: {
      embeddingStatus: true,
      document: { select: { content: true } },
    },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  const rawContent = document.document?.content ?? ''

  // 2. 检查文档是否已完成向量化
  const isEmbedded = document.embeddingStatus === 'completed'

  // 3. 将问题向量化
  const [queryVector] = await createEmbedding([question])

  // 4. 检索相关文档片段
  let sources: Array<{ chunkIndex: number; content: string; similarity: number }> = []

  if (isEmbedded) {
    // 使用向量检索
    sources = await similaritySearch(documentId, queryVector, 5)
  } else {
    // 如果没有向量化，使用原始内容的前几个片段
    const chunks = rawContent.substring(0, 5000).split('\n\n') || []
    sources = chunks.slice(0, 3).map((content: string, idx: number) => ({
      chunkIndex: idx,
      content: content.trim(),
      similarity: 1 - idx * 0.1, // 模拟相似度
    }))
  }

  // 5. 构建上下文
  const context = sources.map((s) => s.content).join('\n\n---\n\n')

  // 6. 构建对话历史
  const historyText = historyChats
    .slice(-5) // 只取最近 5 条
    .map((chat) => `用户：${chat.question}\nAI：${chat.answer}`)
    .join('\n\n')

  // 7. 构建提示词
  const systemPrompt = `你是一位学术文献分析专家。请根据以下文献内容回答用户的问题。

回答要求：
1. 只基于提供的文献内容回答，不要编造信息
2. 如果问题与文献内容无关，请说明"该问题与文献内容无关"
3. 必须引用文献中的具体内容作为回答依据，使用"根据文献..."或"文中提到..."的格式
4. 回答要简洁、准确、有条理
5. 在回答的最后，列出你参考的文献片段（用"[来源 X]"标记）`

  const userPrompt = context
    ? `相关文献内容：
${context}

${historyText ? `对话历史：\n${historyText}\n\n` : ''}
用户问题：${question}

请回答用户的问题：`
    : `文档内容：
${rawContent.substring(0, 10000) || '无内容'}

${historyText ? `对话历史：\n${historyText}\n\n` : ''}
用户问题：${question}

请回答用户的问题：`

  // 8. 调用 AI（这里需要使用项目中现有的 chatWithLogging）
  // 由于不能直接调用，我们返回上下文让调用方处理
  const { chatWithLogging, AI_MODEL } = await import('@/lib/ai')

  const completion = await chatWithLogging({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }, { module: '文献问答-RAG', metadata: { documentId } })

  const answer = completion.choices[0]?.message?.content || ''

  return {
    answer,
    sources,
  }
}

/**
 * 格式化 RAG 结果中的来源引用
 */
export function formatSources(sources: RAGResult['sources']): string {
  if (sources.length === 0) {
    return ''
  }

  return '\n\n---\n\n参考来源：\n' + sources
    .map((s, i) => `[来源 ${i + 1}] ${s.content.substring(0, 200)}${s.content.length > 200 ? '...' : ''}`)
    .join('\n')
}
