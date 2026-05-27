import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 更新选题
 * POST /api/research/projects/[projectId]/ideas/[ideaId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; ideaId: string } }
) {
  try {
    const data = await request.json()
    const { title, rationale, isAdopted } = data

    const idea = await prisma.researchIdea.update({
      where: { id: params.ideaId },
      data: {
        ...(title && { title }),
        ...(rationale && { rationale }),
        ...(isAdopted !== undefined && { isAdopted }),
      },
    })

    return NextResponse.json(idea)
  } catch (error) {
    console.error('更新选题错误:', error)
    return NextResponse.json(
      { error: '更新选题失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除选题
 * DELETE /api/research/projects/[projectId]/ideas/[ideaId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; ideaId: string } }
) {
  try {
    await prisma.researchIdea.delete({
      where: { id: params.ideaId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除选题错误:', error)
    return NextResponse.json(
      { error: '删除选题失败' },
      { status: 500 }
    )
  }
}