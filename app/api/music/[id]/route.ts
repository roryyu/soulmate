import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取单个音乐项目详情
 * GET /api/music/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.researchProject.findUnique({
      where: { id: params.id },
      include: {
        musicCovers: {
          include: {
            musicCover: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: '音乐项目不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('获取音乐项目详情错误:', error)
    return NextResponse.json(
      { error: '获取音乐项目详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新音乐项目
 * PATCH /api/music/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const {
      title,
      field,
      description,
      status,
      prompt,
      sampleRate,
      bitrate,
      format,
      musicCoverIds,
    } = data

    console.log('\n========== 🎵 更新音乐项目 ==========')
    console.log(`📌 项目ID: ${params.id}`)
    if (musicCoverIds) {
      console.log(`📌 更新母带ID: ${musicCoverIds}`)
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (field !== undefined) updateData.field = field
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (prompt !== undefined) updateData.prompt = prompt
    if (sampleRate !== undefined) updateData.sampleRate = sampleRate
    if (bitrate !== undefined) updateData.bitrate = bitrate
    if (format !== undefined) updateData.format = format

    if (musicCoverIds !== undefined) {
      // 使用 set 方式：先删除旧的，再创建新的
      updateData.musicCovers = {
        deleteMany: {},
        create: musicCoverIds.map((id: string) => ({
          musicCoverId: id,
        })),
      }
    }

    const project = await prisma.researchProject.update({
      where: { id: params.id },
      data: updateData,
      include: {
        musicCovers: {
          include: {
            musicCover: true,
          },
        },
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('更新音乐项目错误:', error)
    return NextResponse.json(
      { error: '更新音乐项目失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除音乐项目
 * DELETE /api/music/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.researchProject.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除音乐项目错误:', error)
    return NextResponse.json(
      { error: '删除音乐项目失败' },
      { status: 500 }
    )
  }
}

/**
 * 为音乐项目添加音乐母带
 * POST /api/music/[id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const { musicCoverId } = data

    console.log('\n========== 🎵 添加音乐母带到项目 ==========')
    console.log(`📌 项目ID: ${params.id}`)
    console.log(`📌 音乐母带ID: ${musicCoverId}`)

    const resource = await prisma.musicCoverResource.create({
      data: {
        researchProjectId: params.id,
        musicCoverId,
      },
      include: {
        researchProject: true,
        musicCover: true,
      },
    })

    console.log('✅ 音乐母带添加成功')
    console.log('=========================================\n')
    return NextResponse.json(resource)
  } catch (error) {
    console.error('\n========== ❌ 添加音乐母带错误 ==========')
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`)
    console.error('=========================================\n')
    
    return NextResponse.json(
      { error: '添加音乐母带失败' },
      { status: 500 }
    )
  }
}
