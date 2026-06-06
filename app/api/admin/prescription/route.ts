import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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
 * 创建新的处方
 * POST /api/admin/prescription
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const data = await request.json()
    const { name, prompt, arguments: args } = data

    if (!name?.trim()) {
      return NextResponse.json({ error: '请输入处方名称' }, { status: 400 })
    }

    const prescription = await prisma.prescription.create({
      data: {
        name: name.trim(),
        prompt: prompt?.trim() || null,
        arguments: args?.trim() || null,
      },
    })

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('创建处方错误:', error)
    return NextResponse.json(
      { error: '创建处方失败' },
      { status: 500 }
    )
  }
}
