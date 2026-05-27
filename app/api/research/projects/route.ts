import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取用户所有课题列表
 * GET /api/research/projects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      )
    }

    const projects = await prisma.researchProject.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            ideas: true,
            searches: true,
            references: true,
          },
        },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('获取课题列表错误:', error)
    return NextResponse.json(
      { error: '获取课题列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建新课题
 * POST /api/research/projects
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, title, field, description } = data

    if (!userId || !title) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 如果 field 为空，使用默认值
    const finalField = field?.trim() || '未分类'

    const project = await prisma.researchProject.create({
      data: {
        userId,
        title,
        field: finalField,
        description: description || null,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('创建课题错误:', error)
    return NextResponse.json(
      { error: '创建课题失败' },
      { status: 500 }
    )
  }
}