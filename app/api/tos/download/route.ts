import { NextRequest, NextResponse } from 'next/server'
import { downloadFile, getPresignedUrl } from '@/lib/tos'

// 使用 searchParams 需声明为动态路由，避免构建时静态分析报错
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket')
    const key = searchParams.get('key')
    const filePath = searchParams.get('filePath')

    // 支持两种调用方式：1) bucket + key  2) filePath (自动解析)
    let targetBucket = bucket
    let targetKey = key

    if (filePath && !bucket && !key) {
      // 从 filePath 解析，使用默认 bucket
      targetBucket = process.env.TOS_BUCKET || 'edu-nexus'
      targetKey = filePath
    }

    if (!targetBucket || !targetKey) {
      return NextResponse.json(
        { error: '缺少必要参数：bucket 或 key，或者提供 filePath 参数' },
        { status: 400 }
      )
    }

    // 方案 1：直接下载文件（适合小文件）
    // const result = await downloadFile({ bucket: targetBucket, key: targetKey })
    // return new NextResponse(result.content, {
    //   headers: {
    //     'Content-Type': result.metadata['content-type'] || 'application/octet-stream',
    //     'Content-Disposition': `attachment; filename="${targetKey.split('/').pop()}"`,
    //   },
    // })

    // 方案 2：返回预签名 URL（推荐，适合大文件，让浏览器直接跳转下载）
    const presignedUrl = await getPresignedUrl(targetBucket, targetKey, 3600)
    
    return NextResponse.json({
      success: true,
      message: '获取下载链接成功',
      data: {
        downloadUrl: presignedUrl,
        key: targetKey,
      },
    })
  } catch (error) {
    console.error('TOS 下载错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '下载失败',
      },
      { status: 500 }
    )
  }
}
