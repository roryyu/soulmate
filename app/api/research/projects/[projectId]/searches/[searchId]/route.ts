import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 更新检索记录
 * POST /api/research/projects/[projectId]/searches/[searchId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; searchId: string } }
) {
  try {
    const data = await request.json()
    const { userTopic, cnkiQuery } = data

    const search = await prisma.researchSearch.update({
      where: { id: params.searchId },
      data: {
        ...(userTopic && { userTopic }),
        ...(cnkiQuery && { cnkiQuery }),
      },
    })

    return NextResponse.json(search)
  } catch (error) {
    console.error('更新检索记录错误:', error)
    return NextResponse.json(
      { error: '更新检索记录失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除检索记录
 * DELETE /api/research/projects/[projectId]/searches/[searchId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; searchId: string } }
) {
  try {
    await prisma.researchSearch.delete({
      where: { id: params.searchId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除检索记录错误:', error)
    return NextResponse.json(
      { error: '删除检索记录失败' },
      { status: 500 }
    )
  }
}