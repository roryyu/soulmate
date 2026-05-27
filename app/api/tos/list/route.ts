import { NextRequest, NextResponse } from 'next/server'
import { listObjects } from '@/lib/tos'

// 使用 searchParams 需声明为动态路由，避免构建时静态分析报错
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket')
    const prefix = searchParams.get('prefix') || undefined
    const maxKeys = searchParams.get('maxKeys') ? parseInt(searchParams.get('maxKeys')!) : undefined

    if (!bucket) {
      return NextResponse.json(
        { error: '缺少必要参数: bucket' },
        { status: 400 }
      )
    }

    const objects = await listObjects({
      bucket,
      prefix,
      maxKeys,
    })

    return NextResponse.json({
      success: true,
      message: '文件列举成功',
      data: {
        bucket,
        count: objects.length,
        objects,
      },
    })
  } catch (error) {
    console.error('TOS 列举错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '列举失败',
      },
      { status: 500 }
    )
  }
}
