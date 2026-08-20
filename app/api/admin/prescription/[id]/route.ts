import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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


