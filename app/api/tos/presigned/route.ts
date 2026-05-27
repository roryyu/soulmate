import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUrl } from '@/lib/tos'

// 使用 searchParams 需声明为动态路由，避免构建时静态分析报错
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket')
    const key = searchParams.get('key')
    const expires = searchParams.get('expires') ? parseInt(searchParams.get('expires')!) : 3600

    if (!bucket || !key) {
      return NextResponse.json(
        { error: '缺少必要参数: bucket 或 key' },
        { status: 400 }
      )
    }

    const url = await getPresignedUrl(bucket, key, expires)

    return NextResponse.json({
      success: true,
      message: '预签名URL生成成功',
      data: {
        url,
        bucket,
        key,
        expires,
      },
    })
  } catch (error) {
    console.error('TOS 预签名URL错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成预签名URL失败',
      },
      { status: 500 }
    )
  }
}
