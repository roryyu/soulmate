import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidPhone } from '@/lib/sms/volcano-sms'

/**
 * 手机号登录
 * POST /api/auth/phone-login
 * 
 * 注意：这个 API 只验证验证码，不负责登录
 * 登录由前端调用 next-auth/react 的 signIn 函数完成
 */
export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json()

    // 验证手机号格式
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      )
    }

    // 验证验证码
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: '请输入 6 位验证码' },
        { status: 400 }
      )
    }

    // 查找有效的验证码
    const smsCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        expires: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!smsCode) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 401 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: {
        phone
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '该手机号未注册，请先注册' },
        { status: 404 }
      )
    }

    // 标记验证码为已使用（如果还未使用）
    if (!smsCode.used) {
      await prisma.smsCode.update({
        where: { id: smsCode.id },
        data: { used: true }
      })
    }

    return NextResponse.json({
      success: true,
      message: '验证成功',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      }
    })
  } catch (error) {
    console.error('手机号登录失败:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
