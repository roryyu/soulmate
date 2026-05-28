import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { preprocessMusicCover } from '@/lib/music-pre'
import { MusicCover } from '@prisma/client'

/**
 * 获取所有音乐母带预处理记录列表
 * GET /api/music-covers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const skip = (page - 1) * pageSize

    const [covers, total] = await Promise.all([
      prisma.musicCover.findMany({
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          musicCoverResources: true,
        },
      }),
      prisma.musicCover.count(),
    ])
    let coversData: (MusicCover & { base64data: string })[] = [];
    covers.forEach(cover => {
      coversData.push({
        ...cover,
        base64data: ''
      })
    });
    return NextResponse.json({
      data: coversData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取音乐母带列表错误:', error)
    return NextResponse.json(
      { error: '获取音乐母带列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建新的音乐母带预处理记录
 * POST /api/music-covers
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      name,
      fileName,
      fileType,
      fileSize,
      shouldPreprocess = false,
      audioBase64,
    } = data

    console.log('\n========== 🎵 创建音乐母带记录 ==========')
    console.log(`📌 名称: ${name}`)
    console.log(`📌 文件名: ${fileName}`)
    console.log(`📌 文件类型: ${fileType}`)
    console.log(`📌 文件大小: ${fileSize}`)
    console.log(`📌 立即预处理: ${shouldPreprocess}`)
    console.log(`📌 是否有 Base64: ${!!audioBase64}`)
    if (audioBase64) {
      console.log(`📌 Base64 长度: ${audioBase64.length}`)
    }

    let preprocessResult: any = null
    let status = 'pending'
    let errorMessage: string | null = null

    // 如果有 base64 且需要预处理
    if (shouldPreprocess && audioBase64) {
      try {
        console.log('📌 正在调用 Minimax 预处理...')
        preprocessResult = await preprocessMusicCover({
          audioBase64: audioBase64,
        })
        console.log('✅ 预处理完成')
        status = 'completed'
      } catch (preprocessError) {
        console.error('❌ 预处理失败:', preprocessError)
        status = 'failed'
        errorMessage = preprocessError instanceof Error ? preprocessError.message : '预处理失败'
      }
    }

    // 创建记录
    console.log('📌 正在创建数据库记录...')
    const musicCover = await prisma.musicCover.create({
      data: {
        name: name || null,
        base64data: audioBase64 || null,
        coverFeatureId: preprocessResult?.coverFeatureId || null,
        structureResult: preprocessResult?.structureResult || null,
        audioDuration: preprocessResult?.audioDuration || null,
        status: status,
        error: errorMessage,
      },
    })

    console.log('✅ 数据库记录创建成功')
    console.log('=========================================\n')
    return NextResponse.json(musicCover)
  } catch (error) {
    console.error('\n========== ❌ 创建音乐母带错误 ==========')
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`)
    console.error('=========================================\n')
    
    return NextResponse.json(
      { error: '创建音乐母带失败' },
      { status: 500 }
    )
  }
}
