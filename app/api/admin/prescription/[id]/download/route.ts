import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { downloadFile } from '@/lib/tos'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate'

export async function GET(
  _request: NextRequest,
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
      key: prescription.etag,
    })

    const fileName = `${prescription.name || '处方音频'}.mp3`

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': result.content.length.toString(),
      },
    })
  } catch (error) {
    console.error('下载处方音频错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '下载失败' },
      { status: 500 }
    )
  }
}
