import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取单个文献
 * GET /api/research/projects/[projectId]/references/[referenceId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; referenceId: string } }
) {
  try {
    const reference = await prisma.researchReference.findUnique({
      where: { id: params.referenceId },
    })

    if (!reference) {
      return NextResponse.json(
        { error: '文献不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(reference)
  } catch (error) {
    console.error('获取文献详情错误:', error)
    return NextResponse.json(
      { error: '获取文献详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新文献
 * POST /api/research/projects/[projectId]/references/[referenceId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; referenceId: string } }
) {
  try {
    const data = await request.json()
    const { fileName, summary, innovationPoints, methodology, keyPages } = data

    const reference = await prisma.researchReference.update({
      where: { id: params.referenceId },
      data: {
        ...(fileName && { fileName }),
        ...(summary && { summary }),
        ...(innovationPoints && { innovationPoints }),
        ...(methodology !== undefined && { methodology }),
        ...(keyPages !== undefined && { keyPages }),
      },
    })

    return NextResponse.json(reference)
  } catch (error) {
    console.error('更新文献错误:', error)
    return NextResponse.json(
      { error: '更新文献失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除文献
 * DELETE /api/research/projects/[projectId]/references/[referenceId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; referenceId: string } }
) {
  try {
    await prisma.researchReference.delete({
      where: { id: params.referenceId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除文献错误:', error)
    return NextResponse.json(
      { error: '删除文献失败' },
      { status: 500 }
    )
  }
}