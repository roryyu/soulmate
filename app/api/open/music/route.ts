import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/oss';
import { musicDurations,MUSICS,MusicItem,getTimeTag,randomIndex } from '@/lib/music-data'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile, getPresignedUrl } from '@/lib/oss'
import { join } from 'path'
import { readFileSync, existsSync, mkdirSync } from 'fs'
export const dynamic = 'force-dynamic';


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


const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, data } = body;

    if (!uid) {
      return NextResponse.json({ error: 'uid是必填参数' }, { status: 400 });
    }
/*
    // 获取所有Prescription记录
    const prescriptions = await prisma.prescription.findMany({
      where: {
        key: {
          not: null,
        },
      },
    });

    if (prescriptions.length === 0) {
      return NextResponse.json({ error: '暂无可用的处方数据' }, { status: 404 });
    }

    // 随机选择一条（未来这里会接入大模型选择）
    const randomIndex = Math.floor(Math.random() * prescriptions.length);
    const prescription = prescriptions[randomIndex];

    if (!prescription.key) {
      return NextResponse.json({ error: '处方数据异常：缺少文件路径' }, { status: 500 });
    }
*/
// data中获取tag，可能是数组可能是字符
let timeTag=getTimeTag()
let mid=`0000-0000-0000-0030-${timeTag}`
const tagMap={
  'Anger':['0026'],
  'Sadness':['0027','0028'],
  'Anxiety':['0029'],
  'Joy':['0030'],
  'Numbness':['0031','0032'],
}

if(data && data.tags){
  let tagIndex=null
  if(Array.isArray(data.tags) && data.tags.length>0 && data.tags[0]){
    tagIndex=data.tags[0]
  }
  //如果data.tags是字符串
  if(typeof data.tags==='string'){
    tagIndex=data.tags as keyof typeof tagMap
  }
  if(tagIndex != null && tagMap[tagIndex as keyof typeof tagMap]){
    let mm=tagMap[tagIndex as keyof typeof tagMap];
    if(mm.length>1){
      mid=`0000-0000-0000-${mm[randomIndex(mm.length)]}-${timeTag}`
    }else{
      mid=`0000-0000-0000-${mm[0]}-${timeTag}`
    }
  }
}
console.log(`📌 mid=${mid}`)
    const existing = await prisma.prescription.findFirst({
      where: { name: mid },
    })
    let ossKey:any=''
    if (existing?.key) {
      ossKey=existing.key
    }else{
          const musicItems = MUSICS[mid]
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
          const ossK = `toc-data/${fileId}.mp3`
          const uploadResult = await uploadFile({
            bucket: BUCKET_NAME,
            key: ossK,
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
          ossKey=uploadResult.key
    }
    // 从OSS下载文件
    const result = await downloadFile({
      bucket: BUCKET_NAME,
      key: ossKey,
    });

    // 将Buffer转换为Uint8Array
    const contentArray = new Uint8Array(result.content);

    // 处理Range请求（支持音频拖拽）
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : result.content.length - 1;
      const chunksize = end - start + 1;
      const chunk = contentArray.slice(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${result.content.length}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'audio/mpeg',
        },
      });
    }

    // 返回完整音频流
    return new NextResponse(contentArray, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.content.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('开放接口错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}