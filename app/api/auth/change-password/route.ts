import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { userHasLoginPasswordSet } from '@/lib/user-login-password'

/** 供设置页判断是否需要填写「当前密码」 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      hasPassword: userHasLoginPasswordSet(user.password),
    })
  } catch (error) {
    console.error('查询密码状态错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!newPassword) {
      return NextResponse.json(
        { error: '请提供新密码' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '新密码长度至少需要6个字符' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    const hadPassword = userHasLoginPasswordSet(user.password)

    // 已设置过密码：必须校验当前密码
    if (hadPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: '请提供当前密码' },
          { status: 400 }
        )
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      )
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: '当前密码不正确' },
          { status: 400 }
        )
      }
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
      },
    })

    return NextResponse.json(
      { message: '密码修改成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('密码修改错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
