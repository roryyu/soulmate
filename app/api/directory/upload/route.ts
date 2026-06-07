import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, getPresignedUrl, deleteFile } from '@/lib/oss'
import { ocrPdf, formatOcrContentWithPages } from '@/lib/volcano-visual'
import { getPdfPageCount } from '@/lib/pdf-page-count'
import * as mammoth from 'mammoth'
export const dynamic = 'force-dynamic'

async function bufferToBase64(buffer: Buffer) {
  return buffer.toString('base64')
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 })
  }

    const userId = session?.user?.id;

    // 获取当前用户的tenantId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ error: '当前用户没有所属租户' }, { status: 400 });
    }

    const tenantId = user.tenantId;





  try {
    const formData = await request.formData()
    const directoryId = formData.get('directoryId') as string
    const files = formData.getAll('files') as File[]

    if (!directoryId) {
      return NextResponse.json({ error: '目录ID不能为空' }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
    }

    // 验证目录是否存在
    const directory = await prisma.directory.findUnique({
      where: { id: directoryId }
    })

    if (!directory) {
      return NextResponse.json({ error: '目录不存在' }, { status: 404 })
    }

    const results = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = await bufferToBase64(buffer)
      const fileName = file.name
      let fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx'
      const mimeType = file.type
      // 创建文档记录


    // 中文注释：PDF 页数用于 OCR 计费（每 100 页一档）；先本地解析，避免无效文件占用存储
    let pdfPageCount: number | null = null
    if (file.type === 'application/pdf') {
      try {
        pdfPageCount = await getPdfPageCount(buffer)
      } catch (err) {
        // 中文注释：透出更具体的失败原因（如加密 PDF），便于用户自助排查
        const message =
          err instanceof Error && err.message ? err.message : '无法读取 PDF 页数，请确认文件未损坏'
        return NextResponse.json(
          { error: message },
          { status: 400 }
        )
      }
    }



    let content = ''
    // 生成唯一的文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const fileNameParts = file.name.split('.')
    const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop() : ''
    const uniqueFileName = `${fileNameParts.join('.')}_${timestamp}_${randomString}.${fileExtension}`

    // 构建 TOS 文件路径
    const tosKey = `research/documents/tenant-${tenantId}/${uniqueFileName}`
    const bucket = process.env.TOS_BUCKET || 'edu-nexus'

    // 先上传文件到 TOS（避免大文件 Base64 超出火山视觉 API 的 8MB 限制）
    await uploadFile({
      bucket,
      key: tosKey,
      body: buffer,
      contentType: mimeType,
      metadata: {
        originalFileName: file.name,
        tenantId:tenantId,
      },
    })
    // ???: 租户管理员上传没有扣几分
    if (file.type === 'application/pdf') {
      // 解析 PDF：火山视觉 OCRPdf，使用 TOS 预签名 URL 方式
      const presignedUrl = await getPresignedUrl(bucket, tosKey, 3600)
      
      const ocrResult = await ocrPdf({
        image_url: presignedUrl,
        file_type: 'pdf',
        page_num: 300,
        parse_mode: 'auto',
        table_mode: 'markdown',
      })
      content = formatOcrContentWithPages(ocrResult)
      fileType = 'pdf'
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // 解析 Word
      const result = await mammoth.extractRawText({ buffer })
      content = result.value
      fileType = 'docx'
    }

    // 保存到Document表
    const doc = await prisma.document.create({
      data: {
        fileName: file.name,
        fileType: fileType,
        content: content,
        fileData: tosKey,
        status: 'pending',
        directoryId: directoryId || undefined,
      },
    })


      results.push({
        id: doc.id,
        fileName: doc.fileName,
        status: 'success'
      })
    }

    return NextResponse.json({
      success: true,
      message: `成功上传 ${results.length} 个文档`,
      documents: results
    })
  } catch (error) {
    console.error('上传文档错误:', error)
    return NextResponse.json({ error: '上传文档失败' }, { status: 500 })
  }
}
