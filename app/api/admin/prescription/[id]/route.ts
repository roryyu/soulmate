import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { generateMusic } from '@/lib/music'
import { uploadFile } from '@/lib/tos'
import { v4 as uuidv4 } from 'uuid'

/**
 * 获取单个处方详情
 * GET /api/admin/prescription/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: params.id },
    })

    if (!prescription) {
      return NextResponse.json({ error: '处方不存在' }, { status: 404 })
    }

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('获取处方详情错误:', error)
    return NextResponse.json(
      { error: '获取处方详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新处方
 * PATCH /api/admin/prescription/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const data = await request.json()
    const { name, prompt, arguments: args } = data

    const updateData: any = {}
    if (name !== undefined) updateData.name = name?.trim() || null
    if (prompt !== undefined) updateData.prompt = prompt?.trim() || null
    if (args !== undefined) updateData.arguments = args?.trim() || null

    const prescription = await prisma.prescription.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('更新处方错误:', error)
    return NextResponse.json(
      { error: '更新处方失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除处方
 * DELETE /api/admin/prescription/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    await prisma.prescription.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: '处方已删除' })
  } catch (error) {
    console.error('删除处方错误:', error)
    return NextResponse.json(
      { error: '删除处方失败' },
      { status: 500 }
    )
  }
}

/**
 * 执行处方 - 生成音频
 * POST /api/admin/prescription/[id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: params.id },
    })

    if (!prescription) {
      return NextResponse.json({ error: '处方不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { tocDataId, sampleRate, bitrate, format } = body

    console.log('\n========== 💊 执行处方 ==========')
    console.log(`📌 处方名称: ${prescription.name}`)
    console.log(`📌 处方ID: ${prescription.id}`)

    // 获取 TocData 文件作为音频输入
    let audioBase64: string | undefined
    let coverFeatureId: string | undefined

    if (tocDataId) {
      const tocData = await prisma.tocData.findUnique({
        where: { id: tocDataId },
      })

      if (tocData?.key) {
        // 下载音频文件并转为 base64
        const { downloadFile } = await import('@/lib/tos')
        const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate'
        const result = await downloadFile({
          bucket: BUCKET_NAME,
          key: tocData.key,
        })
        audioBase64 = result.content.toString('base64')
        console.log(`📌 使用音频文件: ${tocData.name}`)
      }
    }

    // 构建提示词
    let finalPrompt = prescription.prompt || ''
    if (prescription.arguments) {
      finalPrompt += '\n' + prescription.arguments
    }

    // 调用音乐生成
    const generateParams: any = {
      prompt: finalPrompt || undefined,
      output_format: 'url',
      aigc_watermark: false,
      is_instrumental: true,
      audio_setting: {
        sample_rate: sampleRate || 44100,
        bitrate: bitrate || 256000,
        format: format || 'mp3',
      },
    }

    if (audioBase64) {
      generateParams.audio_base64 = audioBase64
    }

    console.log('\n========== 🎵 调用音乐生成 ==========')
    const musicResponse = await generateMusic(generateParams)
    console.log('=====================================\n')

    // 下载生成的音频并上传到 TOS
    let tocDataRecord: any = null
    if (musicResponse?.data?.audio) {
      const audioUrl = musicResponse.data.audio
      console.log('\n========== 📥 下载音频文件 ==========')

      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) {
        throw new Error(`下载音频失败: ${audioResponse.status}`)
      }
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

      const fileId = uuidv4()
      const key = `toc-data/${fileId}.mp3`
      const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate'

      const uploadResult = await uploadFile({
        bucket: BUCKET_NAME,
        key,
        body: audioBuffer,
        contentType: 'audio/mpeg',
      })

      tocDataRecord = await prisma.tocData.create({
        data: {
          id: fileId,
          key: uploadResult.key,
          etag: uploadResult.etag,
          name: prescription.name || '处方音频',
        },
      })

      console.log(`📌 TocData 创建成功: ${tocDataRecord.id}`)
      console.log('=====================================\n')
    }

    return NextResponse.json({
      success: true,
      tocData: tocDataRecord,
      musicResponse: {
        duration: musicResponse?.extra_info?.music_duration,
        size: musicResponse?.extra_info?.music_size,
      },
    })
  } catch (error) {
    console.error('\n========== ❌ 执行处方错误 ==========')
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`)
    console.error('=========================================\n')

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '执行处方失败' },
      { status: 500 }
    )
  }
}
