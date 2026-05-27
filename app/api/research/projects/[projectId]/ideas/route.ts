import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取课题的所有选题
 * GET /api/research/projects/[projectId]/ideas
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const ideas = await prisma.researchIdea.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(ideas)
  } catch (error) {
    console.error('获取选题列表错误:', error)
    return NextResponse.json(
      { error: '获取选题列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 保存选题
 * POST /api/research/projects/[projectId]/ideas
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const data = await request.json()
    const { title, rationale, isAdopted } = data

    if (!title || !rationale) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const idea = await prisma.researchIdea.create({
      data: {
        projectId: params.projectId,
        title,
        rationale,
        isAdopted: isAdopted || false,
      },
    })

    return NextResponse.json(idea)
  } catch (error) {
    console.error('保存选题错误:', error)
    return NextResponse.json(
      { error: '保存选题失败' },
      { status: 500 }
    )
  }
}