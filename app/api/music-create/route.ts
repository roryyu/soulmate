import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { uploadFile, getPresignedUrl } from '@/lib/oss'
import { musicDurations,MUSICS,MusicItem } from '@/lib/music-data'



let ffmpeg: any
try {
  ffmpeg = require('fluent-ffmpeg')
} catch (e) {
  console.warn('⚠️ fluent-ffmpeg 未安装')
}
if (ffmpeg) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg')
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || '/opt/homebrew/bin/ffprobe')
}

const MUSIC_DIR = join(process.cwd(), 'music')
const allMusics: Record<string, MusicItem[]> = MUSICS

/**
 * 音乐编辑接口
 * POST /api/music-create
 * 
 * 入参 mid: 例如 "0003-0009-0025-0030-t1"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mid } = body

    if (!mid || typeof mid !== 'string') {
      return NextResponse.json(
        { error: 'mid 参数是必填的' },
        { status: 400 }
      )
    }

    console.log('\n========== 🎵 音乐编辑请求 ==========')
    console.log(`📌 mid: ${mid}`)

    // 查询是否已存在，有则直接返回 OSS 播放地址
    const BUCKET_NAME = process.env.TOS_BUCKET
    if (!BUCKET_NAME) {
      throw new Error('TOS_BUCKET 环境变量未配置')
    }

    const existing = await prisma.prescription.findFirst({
      where: { name: mid },
    })
    if (existing?.key) {
      const url = await getPresignedUrl(BUCKET_NAME, existing.key)
      console.log(`📌 命中缓存，直接返回: ${existing.key}`)
      return NextResponse.json({ url, cached: true })
    }

    const musicItems = allMusics[mid]
    if (!musicItems || musicItems.length === 0) {
      return NextResponse.json({ error: `未找到 mid=${mid} 对应的音乐数据` }, { status: 404 })
    }

    // 收集所有唯一的 base 和 noise，取最大音量
    const baseMap: Record<string, number> = {}  // 文件名 -> 最大音量
    const noiseMap: Record<string, number> = {}

    for (const item of musicItems) {
      const baseVol = (item.tBase ?? 1) * (item.det ?? 1)
      const noiseVol = (item.tNoise ?? 1) * (item.det ?? 1)

      if (item.base) {
        baseMap[item.base] = Math.max(baseMap[item.base] ?? 0, baseVol)
      }
      if (item.noise) {
        noiseMap[item.noise] = Math.max(noiseMap[item.noise] ?? 0, noiseVol)
      }
    }

    console.log(`📌 base 文件:`, baseMap)
    console.log(`📌 noise 文件:`, noiseMap)

    // 总时长 = 所有 base 文件中最长的时长
    const baseFiles = Object.keys(baseMap)
    const durations = baseFiles.map(b => (musicDurations as Record<string, number>)[b] ?? 0)
    const totalDuration = Math.max(...durations)
    console.log(`📌 总时长: ${totalDuration}s`)

    // 构建音轨列表：所有音轨从 0 开始，各自音量
    const tempDir = join(process.cwd(), 'temp', 'music-create')
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

    const outputFile = join(tempDir, `${uuidv4()}.mp3`)

    if (!ffmpeg) {
      throw new Error('fluent-ffmpeg 未安装')
    }

    // 收集所有音频文件和对应音量
    const tracks: Array<{ filePath: string; volume: number }> = []
    for (const [name, vol] of Object.entries(baseMap)) {
      const filePath = join(MUSIC_DIR, `${name}.wav`)
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: `音频文件不存在: ${name}.wav` }, { status: 400 })
      }
      tracks.push({ filePath, volume: vol })
    }
    for (const [name, vol] of Object.entries(noiseMap)) {
      const filePath = join(MUSIC_DIR, `${name}.wav`)
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: `音频文件不存在: ${name}.wav` }, { status: 400 })
      }
      tracks.push({ filePath, volume: vol })
    }

    // 使用 fluent-ffmpeg 混音
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
      const complexFilter: string[] = []

      tracks.forEach((track, i) => {
        command.input(track.filePath)
        complexFilter.push(`[${i}:a]volume=${track.volume.toFixed(4)},atrim=0:${totalDuration}[a${i}]`)
      })

      const mixInputs = tracks.map((_, i) => `[a${i}]`).join('')
      complexFilter.push(`${mixInputs}amix=inputs=${tracks.length}:duration=first:normalize=0[out]`)

      command
        .complexFilter(complexFilter)
        .outputOptions(['-map', '[out]', '-t', `${totalDuration}`])
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .run()
    })

    // 读取输出文件
    const audioBuffer = readFileSync(outputFile)
    console.log(`📌 输出文件大小: ${audioBuffer.length} bytes`)

    // 上传到 OSS
    const fileId = uuidv4()
    const ossKey = `toc-data/${fileId}.mp3`
    const uploadResult = await uploadFile({
      bucket: BUCKET_NAME,
      key: ossKey,
      body: audioBuffer,
      contentType: 'audio/mpeg',
    })
    console.log(`📌 已上传 OSS: ${uploadResult.key}`)

    // 创建 Prescription 记录
    const prescription = await prisma.prescription.create({
      data: {
        name: mid,
        arguments: JSON.stringify(musicItems),
        key: uploadResult.key,
        etag: uploadResult.etag,
      },
    })
    console.log(`📌 Prescription 已创建: ${prescription.id}`)
    // 生成完成后也获取 OSS 播放地址返回
    const url = await getPresignedUrl(BUCKET_NAME, uploadResult.key)
    console.log(`📌 播放地址已生成`)
    console.log('=====================================\n')

    return NextResponse.json({ url, cached: false })
  } catch (error) {
    console.error('音乐编辑错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '音乐编辑失败' },
      { status: 500 }
    )
  }
}
