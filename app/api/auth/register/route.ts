import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { getNewUserGiftCredits, buildNewUserCreditNestedCreate } from '@/lib/system-settings'

/**
 * 处理用户注册请求（仅管理员可访问）
 * POST /api/auth/register
 */
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

    const data = await request.json()
    const { name, email, password } = data

    // 验证必填字段
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '用户已存在' },
        { status: 400 }
      )
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 中文注释：赠送积分数来自系统配置（管理后台「系统配置」）
    const giftCredits = await getNewUserGiftCredits()
    const creditNested = buildNewUserCreditNestedCreate(giftCredits)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        ...creditNested,
      },
    })

    // 返回用户信息（不包含密码）
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '注册失败' },
      { status: 500 }
    )
  }
}