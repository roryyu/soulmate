import { NextRequest, NextResponse } from 'next/server'
import { deleteFile } from '@/lib/tos'

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket')
    const key = searchParams.get('key')

    if (!bucket || !key) {
      return NextResponse.json(
        { error: '缺少必要参数: bucket 或 key' },
        { status: 400 }
      )
    }

    await deleteFile({ bucket, key })

    return NextResponse.json({
      success: true,
      message: '文件删除成功',
      data: { bucket, key },
    })
  } catch (error) {
    console.error('TOS 删除错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '删除失败',
      },
      { status: 500 }
    )
  }
}
