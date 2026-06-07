import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { aiMusicControl, MusicFileInfo } from '@/lib/ai-music-client'
import { uploadFile, downloadFile } from '@/lib/tos'
import { v4 as uuidv4 } from 'uuid'

/**
 * 获取所有处方列表
 * GET /api/admin/prescription
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * pageSize

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { prompt: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ])

    return NextResponse.json({
      data: prescriptions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取处方列表错误:', error)
    return NextResponse.json(
      { error: '获取处方列表失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建处方并一次性执行：调用 AI 音乐控制，合并音频，保存结果
 * POST /api/admin/prescription
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const data = await request.json()
    const { name, prompt, audioFiles = [], totalDuration } = data

    if (!name?.trim()) {
      return NextResponse.json({ error: '请输入处方名称' }, { status: 400 })
    }
    if(audioFiles.length==0){
      return NextResponse.json({ error: '请选择音频素材' }, { status: 400 })
    }
    if(!prompt || prompt.trim() === ''){
      return NextResponse.json({ error: '请输入提示词' }, { status: 400 })
    }
    console.log('\n========== 💊 创建并执行处方 ==========')
    console.log(`📌 处方名称: ${name}`)

    // 将音频文件信息编码到 arguments
    

    // 去除提示词中的 [音频: xxx] 引用标签，保留纯指令文本
    const instruction = prompt
    // 下载所有关联的音频文件并转为 base64
    const BUCKET_NAME = process.env.TOS_BUCKET
    const musicFiles: MusicFileInfo[] = audioFiles

    let etag: string | null = null
    let ekey: string | null = null
    // 如果有音频文件和指令，调用 AI 音乐控制
    let argumentsStr = JSON.stringify({ instruction,musicFiles,totalDuration })
    if (musicFiles.length > 0 && instruction) {
      console.log(`📌 指令: ${instruction}`)
      console.log(`📌 音乐文件数量: ${musicFiles.length}`)

      console.log('\n========== 🎵 调用 AI 音乐控制 ==========')
      const result = await aiMusicControl({
        instruction,
        musicFiles,
        totalDuration: totalDuration || undefined,
      })
      console.log('=====================================\n')
      console.log(`📌 解析说明: ${result.aiResponse}`)
      argumentsStr=JSON.stringify(result.aiResponse)
      // 上传生成的音频到 TOS
      const audioBuffer = result.result
      const fileId = uuidv4()
      const key = `toc-data/${fileId}.mp3`

      const uploadResult = await uploadFile({
        bucket: BUCKET_NAME,
        key,
        body: audioBuffer,
        contentType: 'audio/mpeg',
      })

      etag = uploadResult.etag
      ekey = uploadResult.key
      console.log(`📌 音频已保存: ${uploadResult.key}`)
      console.log(`📌 文件大小: ${audioBuffer.length} bytes`)
    }

    // 创建处方记录
    
    const prescription = await prisma.prescription.create({
      data: {
        name: name.trim(),
        prompt: prompt?.trim() || null,
        arguments: argumentsStr,
        etag,
        key: ekey,
      },
    })

    console.log('✅ 处方创建成功')
    console.log('=========================================\n')

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('\n========== ❌ 创建处方错误 ==========')
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`)
    console.error('=========================================\n')

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建处方失败' },
      { status: 500 }
    )
  }
}
