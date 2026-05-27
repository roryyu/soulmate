import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

/** 简单邮箱格式校验（与常见 RFC 子集兼容即可） */
function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 更新当前登录用户资料（邮箱）
 * PATCH /api/user/profile
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const raw = typeof body.email === 'string' ? body.email.trim() : ''
    if (!raw) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 })
    }

    const normalized = raw.toLowerCase()
    if (!isValidEmailFormat(normalized)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    })
    if (!me) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (me.email === normalized) {
      return NextResponse.json({
        email: normalized,
        message: '邮箱未变更',
      })
    }

    const taken = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    })
    if (taken) {
      return NextResponse.json({ error: '该邮箱已被其他账号使用' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: normalized },
    })

    return NextResponse.json({
      email: normalized,
      message: '邮箱已更新',
    })
  } catch (error) {
    console.error('更新用户资料错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
