import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 获取课题的所有综述大纲
 * GET /api/research/projects/[projectId]/outlines
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const outlines = await prisma.researchOutline.findMany({
      where: { projectId: params.projectId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(outlines)
  } catch (error) {
    console.error('获取大纲列表错误:', error)
    return NextResponse.json(
      { error: '获取大纲列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 保存综述大纲
 * POST /api/research/projects/[projectId]/outlines
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const data = await request.json()
    const { title, content, sourceDocs, status } = data

    if (!title || !content) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const outline = await prisma.researchOutline.create({
      data: {
        projectId: params.projectId,
        title,
        content, // content 是 Markdown 字符串
        sourceDocs: JSON.stringify(sourceDocs || []),
        status: status || 'draft',
      },
    })

    return NextResponse.json(outline)
  } catch (error) {
    console.error('保存大纲错误:', error)
    return NextResponse.json(
      { error: '保存大纲失败' },
      { status: 500 }
    )
  }
}
