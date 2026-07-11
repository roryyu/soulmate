import { NextRequest, NextResponse } from 'next/server'
import { generateImageBySize } from '@/lib/ai'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * 生成图片
 * POST /api/ai/image
 * Body: { prompt: string, size?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 检查权限
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { prompt, size } = data

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt 不能为空' },
        { status: 400 }
      )
    }

    const imageUrl = await generateImageBySize(prompt, size)

    return NextResponse.json({
      imageUrl,
      success: true
    })
  } catch (error: any) {
    console.error('生成图片错误:', error)
    return NextResponse.json(
      { error: error.message || '生成图片失败' },
      { status: 500 }
    )
  }
}
