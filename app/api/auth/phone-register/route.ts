import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidPhone } from '@/lib/sms/volcano-sms'
import { getNewUserGiftCredits, buildNewUserCreditNestedCreate } from '@/lib/system-settings'

/**
 * 手机号注册
 * POST /api/auth/phone-register
 */
export async function POST(request: Request) {
  try {
    const { phone, code, name } = await request.json()

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
        { error: '请输入6位验证码' },
        { status: 400 }
      )
    }

    // 查找有效的验证码
    const smsCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        type: 'REGISTER',
        used: false,
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

    // 标记验证码已使用
    await prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { used: true }
    })

    // 检查手机号是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      )
    }

    // 生成一个临时邮箱用于注册
    const tempEmail = `${phone}@phone.local`

    // 中文注释：赠送积分来自系统配置
    const giftCredits = await getNewUserGiftCredits()
    const creditNested = buildNewUserCreditNestedCreate(giftCredits)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: tempEmail,
        phone,
        name: name || `用户${phone.slice(-4)}`,
        password: '', // 手机号登录不需要密码
        role: 'TEACHER',
        ...creditNested,
      }
    })

    // 注册成功，返回用户信息，由前端负责登录
    return NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      }
    })
  } catch (error) {
    console.error('手机号注册失败:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}
