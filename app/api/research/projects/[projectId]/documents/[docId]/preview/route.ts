import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { downloadFile } from '@/lib/oss'
import mammoth from 'mammoth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 预览文档（PDF 直接返回，Word 转换为 HTML）
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const researchDoc = await prisma.researchDocument.findUnique({
      where: { id: params.docId },
      include: {
        document: {
          select: {
            fileData: true,
            fileType: true,
          }
        }
      },
    })

    if (!researchDoc || !researchDoc.document) {
      return NextResponse.json({ error: '文档不存在' }, { status: 404 })
    }

    if (!researchDoc.document.fileData) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    const bucket = process.env.TOS_BUCKET || 'edu-nexus'

    // 从 TOS 下载文件
    const { content } = await downloadFile({
      bucket,
      key: researchDoc.document.fileData,
    })

    // PDF 直接返回
    if (researchDoc.document.fileType === 'pdf') {
      return new NextResponse(new Uint8Array(content), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Content-Length': content.length.toString(),
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    // Word 文档转换为 HTML
    if (researchDoc.document.fileType === 'docx') {
      const result = await (mammoth.convertToHtml as Function)(content)

      // 简单样式模板
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { font-size: 24px; color: #1a1a1a; margin-top: 24px; }
    h2 { font-size: 20px; color: #2a2a2a; margin-top: 20px; }
    h3 { font-size: 16px; color: #3a3a3a; margin-top: 16px; }
    p { margin: 12px 0; text-align: justify; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td, th { border: 1px solid #ddd; padding: 8px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${result.value}
</body>
</html>`

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })
  } catch (error) {
    console.error('预览文档失败:', error)
    return NextResponse.json({ error: '预览文档失败' }, { status: 500 })
  }
}
