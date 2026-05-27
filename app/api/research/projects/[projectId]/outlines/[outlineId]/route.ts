import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 获取单个大纲详情
 * GET /api/research/projects/[projectId]/outlines/[outlineId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; outlineId: string } }
) {
  try {
    const outline = await prisma.researchOutline.findFirst({
      where: {
        id: params.outlineId,
        projectId: params.projectId,
      },
    })

    if (!outline) {
      return NextResponse.json(
        { error: '大纲不存在' },
        { status: 404 }
      )
    }

    // 解析 sourceDocs 字段
    const response = {
      ...outline,
      sourceDocs: JSON.parse(outline.sourceDocs),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取大纲详情错误:', error)
    return NextResponse.json(
      { error: '获取大纲详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新大纲
 * PUT /api/research/projects/[projectId]/outlines/[outlineId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; outlineId: string } }
) {
  try {
    const data = await request.json()
    const { title, content, status } = data

    const existing = await prisma.researchOutline.findFirst({
      where: {
        id: params.outlineId,
        projectId: params.projectId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '大纲不存在' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (title) updateData.title = title
    if (content) updateData.content = content // content 现在是 Markdown 字符串
    if (status) updateData.status = status

    const outline = await prisma.researchOutline.update({
      where: { id: params.outlineId },
      data: updateData,
    })

    return NextResponse.json(outline)
  } catch (error) {
    console.error('更新大纲错误:', error)
    return NextResponse.json(
      { error: '更新大纲失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除大纲
 * DELETE /api/research/projects/[projectId]/outlines/[outlineId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; outlineId: string } }
) {
  try {
    const existing = await prisma.researchOutline.findFirst({
      where: {
        id: params.outlineId,
        projectId: params.projectId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '大纲不存在' },
        { status: 404 }
      )
    }

    await prisma.researchOutline.delete({
      where: { id: params.outlineId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除大纲错误:', error)
    return NextResponse.json(
      { error: '删除大纲失败' },
      { status: 500 }
    )
  }
}
