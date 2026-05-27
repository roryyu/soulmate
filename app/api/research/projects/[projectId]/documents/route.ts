import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as mammoth from 'mammoth'
import { processDocumentEmbedding } from '@/lib/embedding-utils'
import { checkOcrUploadCredits } from '@/lib/credits'
import { getPdfPageCount } from '@/lib/pdf-page-count'
import { uploadFile, getPresignedUrl, deleteFile } from '@/lib/tos'
import { ocrPdf, formatOcrContentWithPages } from '@/lib/volcano-visual'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 获取文档列表（中文注释：不包含 content / 关联聚合，避免列表一次查出全部正文导致慢查询与大响应）
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const documents = await prisma.researchDocument.findMany({
      where: { projectId: params.projectId },
      include: {
        document: {
          select: {
            fileName: true,
            fileType: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    }) as any[]

    // 转换格式，将document字段展开
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      projectId: doc.projectId,
      fileName: doc.document?.fileName,
      fileType: doc.document?.fileType,
      status: doc.document?.status,
      embeddingStatus: doc.embeddingStatus,
      embeddingProgress: doc.embeddingProgress,
      embeddingError: doc.embeddingError,
      createdAt: doc.createdAt,
    }))

    return NextResponse.json(formattedDocuments)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// 上传文档
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const directoryId = formData.get('directoryId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and Word files (.docx) are allowed' },
        { status: 400 }
      )
    }

    // 验证文献数量限制（最多 30 篇）
    const maxDocuments = 30
    const currentCount = await prisma.researchDocument.count({
      where: { projectId: params.projectId },
    })

    if (currentCount >= maxDocuments) {
      return NextResponse.json(
        { error: `最多只能上传 ${maxDocuments} 篇文献` },
        { status: 400 }
      )
    }

    // 中文注释：解析项目归属，用于按项目所有者扣 OCR 积分
    const project = await prisma.researchProject.findUnique({
      where: { id: params.projectId },
      select: { id: true, userId: true },
    })
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 解析文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type

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

    // 生成唯一的文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const fileNameParts = file.name.split('.')
    const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop() : ''
    const uniqueFileName = `${fileNameParts.join('.')}_${timestamp}_${randomString}.${fileExtension}`

    // 构建 TOS 文件路径
    const tosKey = `research/documents/${params.projectId}/${uniqueFileName}`
    const bucket = process.env.TOS_BUCKET || 'edu-nexus'

    // 先上传文件到 TOS（避免大文件 Base64 超出火山视觉 API 的 8MB 限制）
    await uploadFile({
      bucket,
      key: tosKey,
      body: buffer,
      contentType: mimeType,
      metadata: {
        originalFileName: file.name,
        projectId: params.projectId,
      },
    })

    // 中文注释：TOS 已上传后再扣积分，避免 TOS 失败却先扣费；积分不足则删对象并 402
    if (file.type === 'application/pdf' && pdfPageCount !== null) {
      const creditCheck = await checkOcrUploadCredits(project.userId, pdfPageCount)
      if (!creditCheck.allowed) {
        // 中文注释：后端统一打点，便于排查“PDF OCR 上传”积分不足
        console.warn('[credits] insufficient', {
          operationType: 'OCR_UPLOAD',
          userId: project.userId,
          projectId: project.id,
          pdfPageCount,
          reason: creditCheck.reason ?? '积分不足',
        })
        try {
          await deleteFile({ bucket, key: tosKey })
        } catch (delErr) {
          console.error('积分不足回滚：删除 TOS 文件失败', delErr)
        }
        return NextResponse.json(
          { error: creditCheck.reason ?? '积分不足', code: INSUFFICIENT_CREDITS_CODE },
          { status: 402 }
        )
      }
    }

    let content = ''
    let fileType = ''

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

    // 保存到ResearchDocument表并关联Document
    const document = await prisma.researchDocument.create({
      data: {
        projectId: params.projectId,
        documentId: doc.id,
        embeddingStatus: 'pending',
        embeddingProgress: 0,
      } as any,
    })

    // 触发异步向量化处理（不等待完成）
    setImmediate(async () => {
      try {
        await processDocumentEmbedding(document.id, async (progress, status) => {
          // 进度更新会直接保存到数据库
          console.log(`Document ${document.id} embedding progress: ${progress}% - ${status}`)
        })
      } catch (error) {
        console.error(`Failed to process embedding for document ${document.id}:`, error)
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
