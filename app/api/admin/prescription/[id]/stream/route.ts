import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { downloadFile } from '@/lib/tos'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const prescription = await prisma.prescription.findUnique({
    where: { id: params.id },
  })

  if (!prescription) {
    return NextResponse.json({ error: '处方不存在' }, { status: 404 })
  }

  if (!prescription.etag) {
    return NextResponse.json({ error: '音频未生成，请先执行处方' }, { status: 400 })
  }

  try {
    const result = await downloadFile({
      bucket: BUCKET_NAME,
      key: prescription.key,
    })

    const range = request.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : result.content.length - 1
      const chunksize = end - start + 1
      const chunk = result.content.slice(start, end + 1)

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${result.content.length}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'audio/mpeg',
        },
      })
    }

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.content.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('处方音频流错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取音频失败' },
      { status: 500 }
    )
  }
}
