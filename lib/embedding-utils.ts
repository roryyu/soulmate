import { prisma } from '@/lib/prisma'
import { createEmbedding } from '@/lib/ai'

// 分块配置
const CHUNK_SIZE = 500  // 每个分块约 500 字符
const CHUNK_OVERLAP = 50 // 重叠 50 字符
const BATCH_SIZE = 10    // 每次批量处理 10 个分块

/**
 * 文本分块 - 将长文本分割成较小的重叠片段
 * @param text 要分块的文本
 * @param chunkSize 每个分块的大小（字符数）
 * @param overlap 相邻分块之间的重叠字符数
 * @returns 文本片段数组
 */
export function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    // 提取分块
    let end = start + chunkSize

    // 如果不是第一个分块，则向前看 overlap 个字符，找一个合适的断点
    if (start > 0) {
      const overlapStart = Math.max(0, end - overlap)
      // 尝试在句子边界断开（句号、逗号、换行等）
      const breakChars = ['。', '！', '？', '；', '，', '、', '\n', '.', '!', '?', ';', ',']
      for (let i = end - 1; i >= overlapStart; i--) {
        if (breakChars.includes(text[i])) {
          end = i + 1
          break
        }
      }
    }

    // 确保不超出文本范围
    end = Math.min(end, text.length)

    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // 移动起始位置（考虑重叠）
    start = end - overlap

    // 防止无限循环
    if (chunks.length > 0) {
      const lastChunkEndPos = text.indexOf(chunks[chunks.length - 1]) + chunks[chunks.length - 1].length
      if (start <= lastChunkEndPos) {
        start = end
      }
    }
    if (start >= text.length) {
      break
    }
  }

  return chunks
}

/**
 * 批量向量化文本分块
 * @param chunks 文本片段数组
 * @param onProgress 进度回调函数 (current: number, total: number)
 * @returns 包含向量和内容的分块结果
 */
export async function embedChunks(
  chunks: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ chunkIndex: number; content: string; embedding: number[] }>> {
  if (chunks.length === 0) {
    return []
  }

  const results: Array<{ chunkIndex: number; content: string; embedding: number[] }> = []
  const total = chunks.length

  // 批量处理
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const batchResults = await createEmbedding(batch)

    batch.forEach((content, idx) => {
      results.push({
        chunkIndex: i + idx,
        content,
        embedding: batchResults[idx],
      })
    })

    // 报告进度
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, total), total)
    }
  }

  return results
}

/**
 * 计算两个向量的余弦相似度
 * @param vec1 向量1
 * @param vec2 向量2
 * @returns 相似度分数 (-1 到 1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimension')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (denominator === 0) {
    return 0
  }

  return dotProduct / denominator
}

/**
 * 相似度检索 - 从数据库中检索与查询最相似的文档分块
 * @param documentId 文档ID
 * @param queryVector 查询向量
 * @param topK 返回最相似的 K 个结果
 * @returns 相似分块数组（包含内容、相似度分数）
 */
export async function similaritySearch(
  documentId: string,
  queryVector: number[],
  topK: number = 5
): Promise<Array<{ chunkIndex: number; content: string; similarity: number }>> {
  // 获取文档的所有分块
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
  })

  if (chunks.length === 0) {
    return []
  }

  // 计算每个分块与查询的相似度
  const scoredChunks = chunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    similarity: cosineSimilarity(chunk.embedding as unknown as number[], queryVector),
  }))

  // 按相似度降序排序并返回 topK
  scoredChunks.sort((a, b) => b.similarity - a.similarity)

  return scoredChunks.slice(0, topK)
}

/**
 * 为文档执行完整的向量化流程
 * @param documentId 文档ID
 * @param onProgress 进度回调函数 (progress: number, status: string)
 */
export async function processDocumentEmbedding(
  documentId: string,
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  let researchDoc;
  try {
    // 1. 获取文档
    researchDoc = await prisma.researchDocument.findUnique({
      where: { id: documentId },
      include: { document: true },
    })

    if (!researchDoc || !researchDoc.document || !researchDoc.document.content) {
      throw new Error('Document not found or has no content')
    }

    // 2. 更新状态为 processing
    await prisma.researchDocument.update({
      where: { id: documentId },
      data: {
        embeddingStatus: 'processing',
        embeddingProgress: 0,
        embeddingError: null,
      } as any,
    })

    onProgress?.(0, 'processing')

    // 3. 分块处理
    await prisma.researchDocument.update({
      where: { id: documentId },
      data: { embeddingStatus: 'processing_chunks' } as any,
    })

    const chunks = chunkText(researchDoc.document.content, CHUNK_SIZE, CHUNK_OVERLAP)

    if (chunks.length === 0) {
      await prisma.researchDocument.update({
        where: { id: documentId },
        data: {
          embeddingStatus: 'completed',
          embeddingProgress: 100,
        } as any,
      })
      onProgress?.(100, 'completed')
      return
    }

    // 4. 批量向量化并保存
    const embeddedChunks = await embedChunks(chunks, (current, total) => {
      // 进度：10% 开始分块 -> 90% 向量化完成
      const progress = Math.floor(10 + (current / total) * 80)
      onProgress?.(progress, 'processing_chunks')
    })

    // 5. 存储向量到数据库
    await prisma.documentChunk.createMany({
      data: embeddedChunks.map((chunk) => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding,
      })),
    })

    // 6. 更新状态为完成
    await prisma.researchDocument.update({
      where: { id: documentId },
      data: {
        embeddingStatus: 'completed',
        embeddingProgress: 100,
      } as any,
    })

    onProgress?.(100, 'completed')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // 确保researchDoc存在
    if (researchDoc) {
      await prisma.researchDocument.update({
        where: { id: documentId },
        data: {
          embeddingStatus: 'failed',
          embeddingError: errorMessage,
        } as any,
      }).catch(() => {})
    }

    onProgress?.(0, 'failed')
    throw error
  }
}