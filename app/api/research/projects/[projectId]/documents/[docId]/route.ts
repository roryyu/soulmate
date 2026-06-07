import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPresignedUrl } from '@/lib/oss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 获取单个文档详情（中文注释：含最新一条分析记录，供阅读页 analyze 区使用；并校验归属项目）
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const document = await prisma.researchDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      include: {
        document: {
          select: {
            fileName: true,
            fileType: true,
            content: true,
            fileData: true,
            status: true,
          }
        },
        analyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }) as any

    if (!document || !document.document) {
      return NextResponse.json({ error: '文档不存在' }, { status: 404 })
    }

    // 如果有 TOS 文件路径，生成预签名 URL
    let presignedUrl = null
    if (document.document.fileData) {
      const bucket = process.env.TOS_BUCKET || 'edu-nexus'
      try {
        presignedUrl = await getPresignedUrl(bucket, document.document.fileData, 3600)
      } catch (error) {
        console.error('生成预签名 URL 失败:', error)
      }
    }

    // 合并文档数据
    const result = {
      id: document.id,
      projectId: document.projectId,
      fileName: document.document.fileName,
      fileType: document.document.fileType,
      content: document.document.content,
      fileData: document.document.fileData,
      status: document.document.status,
      embeddingStatus: document.embeddingStatus,
      embeddingProgress: document.embeddingProgress,
      embeddingError: document.embeddingError,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      analyses: document.analyses,
      presignedUrl,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('获取文档详情失败:', error)
    return NextResponse.json({ error: '获取文档详情失败' }, { status: 500 })
  }
}

// 删除文档
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {

    // ???: 只删除ResearchDocument记录，保留Document以便其他ResearchDocument可以关联
    await prisma.researchDocument.delete({
      where: { id: params.docId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
