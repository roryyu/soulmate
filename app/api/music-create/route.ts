import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { uploadFile, getPresignedUrl } from '@/lib/oss'

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
const data = [
    [
        // 扫脸
        {id:'0001',base:'BASE002',noise:'NB02',info:'心跳快',type:'1'},
        {id:'0002',base:'BASE002',noise:'W01',info:'心跳快',type:'1'},
        {id:'0003',base:'BASE002',noise:'NB02',info:'压力大',type:'2'},
        {id:'0004',base:'BASE002',noise:'W01',info:'压力大',type:'2'},
        {id:'0005',base:'BASE001',noise:'NA01',info:'身体放松',type:'3'},
        {id:'0006',base:'BASE001',noise:'NA02',info:'身体放松',type:'3'},
        {id:'0007',base:'BASE003',noise:'NA01',info:'身体放松',type:'3'},
        {id:'0008',base:'BASE003',noise:'NA02',info:'身体放松',type:'3'},
    ],
    [
        // 脑电
        {id:'0009',base:'BASE001',noise:'NA01',info:'精神紧绷焦虑',type:'4'},
        {id:'0010',base:'BASE004',noise:'NA01',info:'精神紧绷焦虑',type:'4'},
        {id:'0011',base:'BASE002',noise:'NB01',info:'很累、耗竭没精神',type:'5'},
        {id:'0012',base:'BASE002',noise:'NB03',info:'很累、耗竭没精神',type:'5'},
        {id:'0013',base:'BASE005',noise:'NB01',info:'很累、耗竭没精神',type:'5'},
        {id:'0014',base:'BASE005',noise:'NB03',info:'很累、耗竭没精神',type:'5'},
        {id:'0015',base:'BASE003',noise:null,info:'脑子思虑多想得多',type:'6'},
    ],
    [
        // 量表
        {id:'0016',base:'BASE001',noise:'NA02',info:'急躁紧绷',type:'7'},
        {id:'0017',base:'BASE001',noise:'W01',info:'急躁紧绷',type:'7'},
        {id:'0018',base:'BASE002',noise:'NA02',info:'压抑无力',type:'8'},
        {id:'0019',base:'BASE002',noise:'W01',info:'压抑无力',type:'8'},
        {id:'0020',base:'BASE003',noise:'NA02',info:'思虑多想',type:'9'},
        {id:'0021',base:'BASE003',noise:'W01',info:'思虑多想',type:'9'},
        {id:'0022',base:'BASE004',noise:'NA02',info:'恐慌压力',type:'10'},
        {id:'0023',base:'BASE004',noise:'W01',info:'恐慌压力',type:'10'},
        {id:'0024',base:'BASE005',noise:'NA02',info:'低落耗竭',type:'11'},
        {id:'0025',base:'BASE005',noise:'W01',info:'低落耗竭',type:'11'},
    ],
    [
        // 自选
        {id:'0026',base:'BASE001',noise:'NA01',info:'愤怒',type:'12'},
        {id:'0027',base:'BASE002',noise:'NB02',info:'悲伤',type:'13'},
        {id:'0028',base:'BASE002',noise:'NB03',info:'悲伤',type:'13'},
        {id:'0029',base:'BASE003',noise:'NA01',info:'焦虑',type:'14'},
        {id:'0030',base:'BASE004',noise:null,info:'快乐',type:'15'},
        {id:'0031',base:'BASE005',noise:'NB02',info:'麻木',type:'16'},
        {id:'0032',base:'BASE005',noise:'NB03',info:'麻木',type:'16'},
    ],
]
const times=[
    {id:'t1',info:'8:00-12:00',base:0.8,noise:0.4},
    {id:'t2',info:'12:00-16:00',base:0.6,noise:0.3},
    {id:'t3',info:'16:00-20:00',base:0.5,noise:0.2},
    {id:'t4',info:'20:00-8:00',base:0.3,noise:0.1},
]
const musicDurations={
  "BASE001": 51.891896,
  "BASE002": 56.453875,
  "BASE003": 50.526313,
  "BASE004": 56.470583,
  "BASE005": 32,
  "NA01": 60,
  "NA02": 60,
  "NB01": 60,
  "NB02": 60,
  "NB03": 60,
  "W01": 60,
  "W02": 60
}
interface MusicItem {
  id: string
  base: string
  noise: string
  info: string
  type: string
  det?: number
  tBase?: number
  tNoise?: number
}
const all: Array<{id: string, music: MusicItem[]}> = []
const allMap: Record<string, MusicItem[]> = {}
for(let t=0;t<times.length;t++){
    let time=times[t]
    let tid=times[t].id;
    for(let i=-1;i<data[0].length;i++){
        let id1='0000'
        let d1: MusicItem | null = null
        if(data[0][i]){
            id1=data[0][i].id;
            d1={...data[0][i], det:0.4}
        }
        for(let j=-1;j<data[1].length;j++){
            let id2='0000'
            let d2: MusicItem | null = null
            if(data[1][j]){
                id2=data[1][j].id;
                d2={...data[1][j], det:0.4}
            }
            for(let m=-1;m<data[2].length;m++){
                let id3='0000'
                let d3: MusicItem | null = null
                if(data[2][m]){
                    id3=data[2][m].id;
                    d3={...data[2][m], det:0.6}
                }
                for(let n=-1;n<data[3].length;n++){
                    let id4='0000'
                    let d4: MusicItem | null = null
                    if(data[3][n]){
                        id4=data[3][n].id;
                        d4={...data[3][n], det:1}
                    }
                    let allid=`${id1}-${id2}-${id3}-${id4}-${tid}`
                    let music=[]
                    if(d1){
                        d1.tBase=time.base
                        d1.tNoise=time.noise
                        music.push(d1)
                    }
                    if(d2){
                        d2.tBase=time.base
                        d2.tNoise=time.noise
                        music.push(d2)
                    }
                    if(d3){
                        d3.tBase=time.base
                        d3.tNoise=time.noise
                        music.push(d3)
                    }
                    if(d4){
                        d4.tBase=time.base
                        d4.tNoise=time.noise
                        music.push(d4)
                    }
                    all.push({id:allid,music:music})
                    allMap[allid]=music
                }
            }
        }
    }
}

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

    const musicItems = allMap[mid]
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
