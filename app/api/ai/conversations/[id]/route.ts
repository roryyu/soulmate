import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 使用 Node.js runtime，因为 Prisma 不支持 Edge Runtime
export const runtime = 'nodejs'

/**
 * 获取单条对话记录
 * GET /api/ai/conversations/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const conversation = await prisma.aIConversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: '对话记录不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('获取对话记录错误:', error)
    return NextResponse.json(
      { error: '获取对话记录失败' },
      { status: 500 }
    )
  }
}
