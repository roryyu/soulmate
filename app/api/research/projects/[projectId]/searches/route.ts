import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取课题的所有检索记录
 * GET /api/research/projects/[projectId]/searches
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const searches = await prisma.researchSearch.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(searches)
  } catch (error) {
    console.error('获取检索记录错误:', error)
    return NextResponse.json(
      { error: '获取检索记录失败' },
      { status: 500 }
    )
  }
}

/**
 * 保存检索记录
 * POST /api/research/projects/[projectId]/searches
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const data = await request.json()
    const { userTopic, cnkiQuery } = data

    if (!userTopic || !cnkiQuery) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const search = await prisma.researchSearch.create({
      data: {
        projectId: params.projectId,
        userTopic,
        cnkiQuery,
      },
    })

    return NextResponse.json(search)
  } catch (error) {
    console.error('保存检索记录错误:', error)
    return NextResponse.json(
      { error: '保存检索记录失败' },
      { status: 500 }
    )
  }
}