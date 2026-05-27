import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import { uploadFile, getPresignedUrl, deleteFile } from '@/lib/tos'
import { ocrPdf, formatOcrContentWithPages } from '@/lib/volcano-visual'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** PDF 走火山 OCRPdf，先上传 TOS 再用 URL 解析（避免大文件超出 8MB 限制） */
async function extractTextFromPdf(buffer: Buffer, fileName: string): Promise<string> {
  // 生成临时文件名
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 10)
  const uniqueFileName = `temp/documents/${fileName}_${timestamp}_${randomString}.pdf`
  const bucket = process.env.TOS_BUCKET || 'edu-nexus'

  try {
    // 先上传到 TOS
    await uploadFile({
      bucket,
      key: uniqueFileName,
      body: buffer,
      contentType: 'application/pdf',
    })

    // 生成预签名 URL
    const presignedUrl = await getPresignedUrl(bucket, uniqueFileName, 3600)

    // 使用 URL 调用 OCR API
    const ocrResult = await ocrPdf({
      image_url: presignedUrl,
      file_type: 'pdf',
      page_num: 300,
      parse_mode: 'auto',
      table_mode: 'markdown',
    })

    const content = formatOcrContentWithPages(ocrResult)

    // 解析完成后删除临时文件（不等待，不影响结果）
    setImmediate(async () => {
      try {
        await deleteFile({ bucket, key: uniqueFileName })
      } catch (error) {
        console.error('删除临时文件失败:', error)
      }
    })

    return content
  } catch (error) {
    // 如果 URL 方式失败，尝试回退到 Base64 方式
    console.warn('URL 方式解析 PDF 失败，回退到 Base64 方式:', error)
    const base64 = buffer.toString('base64')
    const ocrResult = await ocrPdf({
      image_base64: base64,
      file_type: 'pdf',
      page_num: 300,
      parse_mode: 'auto',
      table_mode: 'markdown',
    })
    return formatOcrContentWithPages(ocrResult)
  }
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and Word files (.docx) are allowed' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''
    let fileType = ''

    if (file.type === 'application/pdf') {
      text = await extractTextFromPdf(buffer, file.name)
      fileType = 'PDF'
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractTextFromWord(buffer)
      fileType = 'Word (.docx)'
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      text: text,
      fileType: fileType,
    })
  } catch (error) {
    console.error('Document parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    )
  }
}
