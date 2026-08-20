import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * 获取对话记录列表
 * GET /api/ai/conversations
 */
export async function GET(request: NextRequest) {
  try {
    // 检查权限
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userName = searchParams.get('userName')
    const moduleFilter = searchParams.get('module')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status') // success, error, all
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}

    // 管理员可以查看所有用户的记录，普通用户只能查看自己的
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    } else if (userName) {
      // 管理员可以按用户名筛选
      where.userName = { contains: userName, mode: 'insensitive' }
    }

    // 按模块筛选
    if (moduleFilter) {
      where.module = moduleFilter
    }

    // 按时间范围筛选
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        // 开始日期从 0 点开始
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.createdAt.gte = start
      }
      if (endDate) {
        // 结束日期到 24 点（23:59:59.999）
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // 按状态筛选
    if (status === 'success') {
      where.error = null
    } else if (status === 'error') {
      where.error = { not: null }
    }

    // 搜索 prompt 和 response 内容
    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: 'insensitive' } },
        { response: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [conversations, total] = await Promise.all([
      prisma.aIConversation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aIConversation.count({ where }),
    ])

    return NextResponse.json({
      conversations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('获取对话记录错误:', error)
    return NextResponse.json(
      { error: '获取对话记录失败' },
      { status: 500 }
    )
  }
}

/**
 * 获取对话记录统计信息
 * POST /api/ai/conversations
 */
export async function POST(request: NextRequest) {
  try {
    // 检查权限
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const userName = data.userName

    const where: Record<string, unknown> = {}

    // 管理员可以查看所有用户的统计，普通用户只能查看自己的
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    } else if (userName) {
      // 管理员可以按用户名筛选
      where.userName = { contains: userName, mode: 'insensitive' }
    }

    // 统计各模块的调用次数
    const moduleStats = await prisma.aIConversation.groupBy({
      by: ['module'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    // 总调用次数
    const totalCount = await prisma.aIConversation.count({ where })

    // 成功/失败统计
    const [successCount, errorCount] = await Promise.all([
      prisma.aIConversation.count({
        where: { ...where, error: null },
      }),
      prisma.aIConversation.count({
        where: { ...where, error: { not: null } },
      }),
    ])

    // 总 token 消耗
    const tokenStats = await prisma.aIConversation.aggregate({
      where: { ...where, tokens: { not: null } },
      _sum: {
        tokens: true,
      },
    })

    // 平均响应时间
    const durationStats = await prisma.aIConversation.aggregate({
      where: { ...where, duration: { not: null } },
      _avg: {
        duration: true,
      },
    })

    return NextResponse.json({
      totalCount,
      successCount,
      errorCount,
      moduleStats: moduleStats.map((m) => ({
        module: m.module,
        count: m._count.id,
      })),
      totalTokens: tokenStats._sum.tokens || 0,
      avgDuration: Math.round(durationStats._avg.duration || 0),
    })
  } catch (error) {
    console.error('获取统计信息错误:', error)
    return NextResponse.json(
      { error: '获取统计信息失败' },
      { status: 500 }
    )
  }
}
