import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取课题的所有文献
 * GET /api/research/projects/[projectId]/references
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const references = await prisma.researchReference.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(references)
  } catch (error) {
    console.error('获取文献列表错误:', error)
    return NextResponse.json(
      { error: '获取文献列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 保存文献分析结果
 * POST /api/research/projects/[projectId]/references
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const data = await request.json()
    const { fileName, summary, innovationPoints, methodology, keyPages } = data

    if (!fileName || !summary || !innovationPoints) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const reference = await prisma.researchReference.create({
      data: {
        projectId: params.projectId,
        fileName,
        summary,
        innovationPoints,
        methodology: methodology || null,
        keyPages: keyPages || null,
      },
    })

    return NextResponse.json(reference)
  } catch (error) {
    console.error('保存文献错误:', error)
    return NextResponse.json(
      { error: '保存文献失败' },
      { status: 500 }
    )
  }
}