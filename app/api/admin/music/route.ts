import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMusic } from '@/lib/music'
import { requireAdmin } from '@/lib/admin-auth';
import { uploadFile } from '@/lib/tos';
import { v4 as uuidv4 } from 'uuid';
/**
 * 获取所有音乐项目列表
 * GET /api/admin/music
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
 * POST /api/admin/music
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
    }else{
      const generateParams = {
        prompt: prompt || undefined,
        output_format: 'url',
        aigc_watermark: false,
        is_instrumental: true,
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

    // 下载生成的音频文件并上传到 TOS
    let tocDataId: string | null = null
    if (musicGenerationResponse?.data?.audio) {
      const audioUrl = musicGenerationResponse.data.audio
      console.log('\n========== 📥 下载音频文件 ==========')
      console.log(`📌 URL: ${audioUrl}`)

      try {
        // 下载音频文件
        const audioResponse = await fetch(audioUrl)
        if (!audioResponse.ok) {
          throw new Error(`下载音频失败: ${audioResponse.status}`)
        }
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
        console.log(`📌 文件大小: ${audioBuffer.length} bytes`)

        // 上传到 TOS
        const fileId = uuidv4()
        const key = `toc-data/${fileId}.mp3`
        const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate'

        const uploadResult = await uploadFile({
          bucket: BUCKET_NAME,
          key,
          body: audioBuffer,
          contentType: 'audio/mpeg',
        })

        console.log(`📌 上传成功: ${uploadResult.key}`)

        // 创建 TocData 记录
        const tocData = await prisma.tocData.create({
          data: {
            id: fileId,
            key: uploadResult.key,
            etag: uploadResult.etag,
            name:title,
          },
        })

        tocDataId = tocData.id
        console.log(`📌 TocData 创建成功: ${tocDataId}`)
        console.log('=====================================\n')
      } catch (downloadError) {
        console.error('\n========== ❌ 音频下载/上传错误 ==========')
        console.error(`📌 错误: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`)
        console.error('============================================\n')
        // 不中断流程，继续创建项目
      }
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
        tocDataId: tocDataId ?? undefined,
      } as any,
      include: {
        tocData: true,
      } as any,
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
