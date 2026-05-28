import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMusic } from '@/lib/music'

/**
 * 获取所有音乐项目列表
 * GET /api/music
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const userId = searchParams.get('userId')

    const skip = (page - 1) * pageSize

    const where: any = {}
    if (userId) where.userId = userId

    const [projects, total] = await Promise.all([
      prisma.researchProject.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          musicCovers: {
            include: {
              musicCover: true,
            },
          },
        },
      }),
      prisma.researchProject.count({ where }),
    ])

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取音乐项目列表错误:', error)
    return NextResponse.json(
      { error: '获取音乐项目列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建新的音乐项目
 * POST /api/music
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      userId,
      title,
      field,
      description,
      status,
      prompt,
      sampleRate,
      bitrate,
      format,
      musicCoverIds = [],
    } = data

    console.log('\n========== 🎵 创建音乐项目 ==========')
    console.log(`📌 标题: ${title}`)
    console.log(`📌 领域: ${field}`)
    console.log(`📌 用户ID: ${userId}`)
    console.log(`📌 关联母带ID: ${musicCoverIds}`)

    // 获取第一个 musicCover 并获取 base64data 和 cover_feature_id
    let musicCover = null
    if (musicCoverIds.length > 0) {
      musicCover = await prisma.musicCover.findUnique({
        where: { id: musicCoverIds[0] },
      })
      if (musicCover) {
        console.log(`📌 找到母带: ${musicCover.name}`)
        console.log(`📌 特征ID: ${musicCover.coverFeatureId}`)
        console.log(`📌 Base64长度: ${musicCover.base64data?.length || 0}`)
      }
    }

    // 调用 generateMusic
    let musicGenerationResponse = null
    if (musicCover) {
      const generateParams = {
        prompt: prompt || undefined,
        output_format: 'url',
        aigc_watermark: false,
        is_instrumental: true,
        audio_base64: musicCover.base64data || undefined,
        cover_feature_id: musicCover.coverFeatureId || undefined,
        audio_setting: {
          sample_rate: sampleRate || 44100,
          bitrate: bitrate || 256000,
          format: format || 'mp3',
        },
      }

      console.log('\n========== 🎵 调用音乐生成 ==========')
      console.log(`📌 参数:`, generateParams)

      musicGenerationResponse = await generateMusic(generateParams)

      console.log('\n========== ✅ 音乐生成返回值 ==========')
      console.log(musicGenerationResponse)
      console.log('=====================================\n')
    }

    // 创建项目
    const project = await prisma.researchProject.create({
      data: {
        userId,
        title,
        field,
        description: description || null,
        status: status || 'DRAFT',
        prompt: prompt || null,
        sampleRate: sampleRate || 44100,
        bitrate: bitrate || 256000,
        format: format || 'mp3',
        musicCovers: {
          create: musicCoverIds.map((id: string) => ({
            musicCoverId: id,
          })),
        },
      },
      include: {
        musicCovers: {
          include: {
            musicCover: true,
          },
        },
      },
    })

    console.log('✅ 音乐项目创建成功')
    console.log('=========================================\n')
    return NextResponse.json(project)
  } catch (error) {
    console.error('\n========== ❌ 创建音乐项目错误 ==========')
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`)
    console.error('=========================================\n')
    
    return NextResponse.json(
      { error: '创建音乐项目失败' },
      { status: 500 }
    )
  }
}
