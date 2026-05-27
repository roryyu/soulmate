import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取单个课题详情
 * GET /api/research/projects/[projectId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const project = await prisma.researchProject.findUnique({
      where: { id: params.projectId },
      include: {
        ideas: {
          orderBy: { createdAt: 'desc' },
        },
        searches: {
          orderBy: { createdAt: 'desc' },
        },
        references: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: '课题不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('获取课题详情错误:', error)
    return NextResponse.json(
      { error: '获取课题详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新课题
 * POST /api/research/projects/[projectId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const data = await request.json()
    const { title, field, description, status } = data

    const project = await prisma.researchProject.update({
      where: { id: params.projectId },
      data: {
        ...(title && { title }),
        ...(field && { field }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('更新课题错误:', error)
    return NextResponse.json(
      { error: '更新课题失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除课题
 * DELETE /api/research/projects/[projectId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await prisma.researchProject.delete({
      where: { id: params.projectId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除课题错误:', error)
    return NextResponse.json(
      { error: '删除课题失败' },
      { status: 500 }
    )
  }
}