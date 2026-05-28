import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePresignedUrl, downloadFile } from '@/lib/tos'
import { preprocessMusicCover } from '@/lib/music-pre'

/**
 * 获取单个音乐母带预处理记录详情
 * GET /api/music-covers/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const musicCover = await prisma.musicCover.findUnique({
      where: { id: params.id },
      include: {
        musicCoverResources: {
          include: {
            researchProject: true,
          },
        },
      },
    })

    if (!musicCover) {
      return NextResponse.json(
        { error: '音乐母带记录不存在' },
        { status: 404 }
      )
    }

    // 生成预签名 URL（用于前端播放器）
    if (musicCover.audioFilePath) {
      const bucket = process.env.TOS_BUCKET
      const endpoint = process.env.TOS_ENDPOINT
      if (bucket && endpoint) {
        try {
          // 优先使用公网 URL，同时也提供预签名 URL
          let publicUrl = '';
          if (endpoint.includes('https://') || endpoint.includes('http://')) {
            publicUrl = `${endpoint.replace(/\/$/, '')}/${musicCover.audioFilePath}`;
          } else {
            publicUrl = `https://${endpoint}/${musicCover.audioFilePath}`;
          }
          
          musicCover.audioFileUrl = publicUrl;
        } catch (e) {
          console.warn('生成公网 URL 失败')
        }
      }
    }

    return NextResponse.json({...musicCover, base64data: ''})
  } catch (error) {
    console.error('获取音乐母带详情错误:', error)
    return NextResponse.json(
      { error: '获取音乐母带详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新音乐母带预处理记录
 * PATCH /api/music-covers/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const {
      name,
      coverFeatureId,
      structureResult,
      base64data,
      audioDuration,
      audioFilePath,
      audioFileUrl,
      shouldRePreprocess = false, // 重新预处理
    } = data

    // 构建更新数据
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (coverFeatureId !== undefined) updateData.coverFeatureId = coverFeatureId
    if (structureResult !== undefined) updateData.structureResult = structureResult
    if (base64data !== undefined) updateData.base64data = base64data
    if (audioDuration !== undefined) updateData.audioDuration = audioDuration
    if (audioFilePath !== undefined) updateData.audioFilePath = audioFilePath
    if (audioFileUrl !== undefined) updateData.audioFileUrl = audioFileUrl

    // 如果需要重新预处理
    if (shouldRePreprocess && audioFileUrl) {
      console.log('\n========== 🎵 重新预处理音乐母带 ==========');
      console.log(`📌 ID: ${params.id}`);
      
      updateData.status = 'processing'
      
      let updatedCover = await prisma.musicCover.update({
        where: { id: params.id },
        data: updateData,
      })

      try {
        // 调用预处理 API
        const preprocessResult = await preprocessMusicCover({
          audioUrl: audioFileUrl,
        })

        console.log('✅ 预处理完成');

        // 更新预处理结果
        updatedCover = await prisma.musicCover.update({
          where: { id: params.id },
          data: {
            coverFeatureId: preprocessResult.coverFeatureId,
            structureResult: preprocessResult.structureResult,
            audioDuration: preprocessResult.audioDuration,
            status: 'completed',
            error: null,
            updatedAt: new Date(),
          },
        })

        console.log('=========================================\n');
        return NextResponse.json(updatedCover)
      } catch (preprocessError) {
        console.error('❌ 重新预处理失败:', preprocessError);
        
        // 更新失败状态
        updatedCover = await prisma.musicCover.update({
          where: { id: params.id },
          data: {
            status: 'failed',
            error: preprocessError instanceof Error ? preprocessError.message : String(preprocessError),
            updatedAt: new Date(),
          },
        })
        
        return NextResponse.json(updatedCover)
      }
    }

    const updatedCover = await prisma.musicCover.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedCover)
  } catch (error) {
    console.error('更新音乐母带错误:', error)
    return NextResponse.json(
      { error: '更新音乐母带失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除音乐母带预处理记录
 * DELETE /api/music-covers/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.musicCover.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除音乐母带错误:', error)
    return NextResponse.json(
      { error: '删除音乐母带失败' },
      { status: 500 }
    )
  }
}

/**
 * 重新预处理音乐母带
 * POST /api/music-covers/[id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const musicCover = await prisma.musicCover.findUnique({
      where: { id: params.id },
    })

    if (!musicCover) {
      return NextResponse.json(
        { error: '音乐母带记录不存在' },
        { status: 404 }
      )
    }

    if (!musicCover.audioFilePath) {
      return NextResponse.json(
        { error: '没有音频文件，无法预处理' },
        { status: 400 }
      )
    }

    const bucket = process.env.TOS_BUCKET
    if (!bucket) {
      throw new Error('TOS_BUCKET 环境变量未设置')
    }

    // 更新状态为处理中
    await prisma.musicCover.update({
      where: { id: params.id },
      data: { status: 'processing', updatedAt: new Date() },
    })

    console.log('\n========== 🎵 重新预处理音乐母带 ==========');
    console.log(`📌 ID: ${params.id}`);
    console.log(`📌 文件路径: ${musicCover.audioFilePath}`);

    try {
      // 从 TOS 下载文件
      console.log('📌 正在从 TOS 下载文件...');
      const { content } = await downloadFile({
        bucket,
        key: musicCover.audioFilePath,
      });
      
      // 转为 base64
      const audioBase64 = content.toString('base64');
      console.log('✅ 文件下载并转换为 Base64');

      // 调用预处理 API
      console.log('📌 正在调用 Minimax 预处理...');
      const preprocessResult = await preprocessMusicCover({
        audioBase64,
      })

      console.log('✅ 预处理完成');

      // 更新预处理结果
      const updatedCover = await prisma.musicCover.update({
        where: { id: params.id },
        data: {
          coverFeatureId: preprocessResult.coverFeatureId,
          structureResult: preprocessResult.structureResult,
          audioDuration: preprocessResult.audioDuration,
          status: 'completed',
          error: null,
          updatedAt: new Date(),
        },
      })

      console.log('=========================================\n');
      return NextResponse.json(updatedCover)
    } catch (preprocessError) {
      console.error('❌ 重新预处理失败:', preprocessError);
      
      // 更新失败状态
      const updatedCover = await prisma.musicCover.update({
        where: { id: params.id },
        data: {
          status: 'failed',
          error: preprocessError instanceof Error ? preprocessError.message : String(preprocessError),
          updatedAt: new Date(),
        },
      })
      
      return NextResponse.json(updatedCover)
    }
  } catch (error) {
    console.error('重新预处理音乐母带错误:', error)
    return NextResponse.json(
      { error: '重新预处理失败' },
      { status: 500 }
    )
  }
}
