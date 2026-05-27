import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/tos'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const bucket = formData.get('bucket') as string
    const key = formData.get('key') as string
    const file = formData.get('file') as File | null
    const content = formData.get('content') as string | null

    if (!bucket || !key) {
      return NextResponse.json(
        { error: '缺少必要参数: bucket 或 key' },
        { status: 400 }
      )
    }

    let body: Buffer
    let contentType: string | undefined

    if (file) {
      // 处理文件上传
      const bytes = await file.arrayBuffer()
      body = Buffer.from(bytes)
      contentType = file.type
    } else if (content) {
      // 处理文本内容上传
      body = Buffer.from(content)
      contentType = 'text/plain'
    } else {
      return NextResponse.json(
        { error: '请提供文件或内容' },
        { status: 400 }
      )
    }

    const result = await uploadFile({
      bucket,
      key,
      body,
      contentType,
    })

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      data: {
        key: result.key,
        filePath: result.key, // 为了兼容性，同时返回 key 和 filePath
      },
    })
  } catch (error) {
    console.error('TOS 上传错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '上传失败',
      },
      { status: 500 }
    )
  }
}
