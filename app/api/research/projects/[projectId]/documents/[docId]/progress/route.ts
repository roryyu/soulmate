import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 获取文档向量化进度
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const researchDoc = await prisma.researchDocument.findUnique({
      where: { id: params.docId },
      include: {
        _count: { select: { chunks: true } },
      },
    }) as any

    if (!researchDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      documentId: researchDoc.id,
      status: researchDoc.embeddingStatus,
      progress: researchDoc.embeddingProgress,
      error: researchDoc.embeddingError,
      chunkCount: researchDoc._count.chunks,
    })
  } catch (error) {
    console.error('Error fetching embedding progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}
