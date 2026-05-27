import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 更新文档分析结果
 * PUT /api/research/projects/[projectId]/documents/[docId]/analysis/[analysisId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string; analysisId: string } }
) {
  try {
    const data = await request.json()
    const { content } = data

    // 验证文档存在
    const document = await prisma.researchDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: '文档不存在' },
        { status: 404 }
      )
    }

    // 验证分析记录存在
    const existing = await prisma.documentAnalysis.findFirst({
      where: {
        id: params.analysisId,
        documentId: params.docId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '分析记录不存在' },
        { status: 404 }
      )
    }

    // 更新分析内容
    const analysis = await prisma.documentAnalysis.update({
      where: { id: params.analysisId },
      data: {
        content: content,
      },
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('更新分析结果错误:', error)
    return NextResponse.json(
      { error: '更新分析结果失败' },
      { status: 500 }
    )
  }
}
