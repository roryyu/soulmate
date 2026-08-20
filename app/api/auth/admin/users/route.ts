import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { getNewUserGiftCredits, buildNewUserCreditNestedCreate } from '@/lib/system-settings'

// 获取用户列表（管理员权限）
export async function GET() {
  try {
    // 验证管理员权限
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 检查用户是否是管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const now = new Date()

    // 获取所有用户列表（包含：积分余额、当前有效会员到期时间/产品名、所属租户）
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        tenantId: true,
        tenant: { select: { id: true, name: true } },
        // 中文注释：积分钱包为一对一，可为空（未初始化）
        credit: { select: { balance: true } },
        // 中文注释：只取当前有效会员（ACTIVE 且未到期）中到期时间最晚的一条
        memberships: {
          where: { status: 'ACTIVE', endAt: { gt: now } },
          orderBy: { endAt: 'desc' },
          take: 1,
          select: {
            startAt: true,
            endAt: true,
            product: { select: { name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const normalizedUsers = users.map((u) => {
      const membership = u.memberships[0] ?? null
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        tenantId: u.tenantId,
        tenant: u.tenant,
        creditsBalance: u.credit?.balance ?? 0,
        membership: membership
          ? {
              startAt: membership.startAt,
              endAt: membership.endAt,
              productName: membership.product?.name ?? null,
              productType: membership.product?.type ?? null,
            }
          : null,
      }
    })

    return NextResponse.json({ users: normalizedUsers })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// 创建新用户（管理员权限）
export async function POST(request: Request) {
  try {
    // 验证管理员权限
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 检查用户是否是管理员
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password } = body

    // 验证输入
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码为必填项' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少为6个字符' }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 中文注释：赠送积分与前台注册一致，读取系统配置
    const giftCredits = await getNewUserGiftCredits()
    const creditNested = buildNewUserCreditNestedCreate(giftCredits)

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER', // 默认创建教师角色
        ...creditNested,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      message: '用户创建成功',
      user: newUser
    }, { status: 201 })
  } catch (error) {
    console.error('创建用户错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}