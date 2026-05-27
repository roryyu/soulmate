import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  generateVerificationCode,
  sendSmsCode,
  isValidPhone,
  getCodeExpiry,
  getSendInterval,
  SMS_SEND_INTERVAL_MS
} from '@/lib/sms/volcano-sms'

/**
 * 发送短信验证码
 * POST /api/auth/send-sms-code
 */
export async function POST(request: Request) {
  try {
    const { phone, type = 'LOGIN' } = await request.json()

    // 验证手机号格式
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      )
    }

    // 检查发送频率（同一手机号60秒内只能发送一次）
    const recentCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        type,
        createdAt: {
          gt: new Date(Date.now() - SMS_SEND_INTERVAL_MS)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (recentCode) {
      const remainingSeconds = Math.ceil(
        (recentCode.createdAt.getTime() + SMS_SEND_INTERVAL_MS - Date.now()) / 1000
      )
      return NextResponse.json(
        { error: `请 ${remainingSeconds} 秒后再试` },
        { status: 429 }
      )
    }

    // 生成验证码
    const code = generateVerificationCode()

    // 如果是注册类型，检查手机号是否已注册
    if (type === 'REGISTER') {
      const existingUser = await prisma.user.findUnique({
        where: { phone }
      })
      if (existingUser) {
        return NextResponse.json(
          { error: '该手机号已注册，请直接登录' },
          { status: 400 }
        )
      }
    }

    // 如果是登录类型，检查手机号是否已注册
    if (type === 'LOGIN') {
      const existingUser = await prisma.user.findUnique({
        where: { phone }
      })
      if (!existingUser) {
        return NextResponse.json(
          { error: '该手机号未注册，请先注册' },
          { status: 404 }
        )
      }
    }

    // 保存验证码到数据库
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        type,
        expires: getCodeExpiry(),
      }
    })

    // 发送短信（仅在配置了环境变量时）
    const accessKeyId = process.env.VOLCANO_SMS_ACCESS_KEY_ID
    const accessKeySecret = process.env.VOLCANO_SMS_ACCESS_KEY_SECRET
    const smsAccount = process.env.VOLCANO_SMS_ACCOUNT || ''
    const sign = process.env.VOLCANO_SMS_SIGN || 'Soulmate'
    const templateId = process.env.VOLCANO_SMS_TEMPLATE_ID || ''

    if (accessKeyId && accessKeySecret && smsAccount && templateId) {
      await sendSmsCode({
        phone,
        code,
        smsAccount,
        sign,
        templateId,
        accessKeyId,
        accessKeySecret,
      })
    } else {
      // 开发环境：直接返回验证码（方便测试）
      console.log(`【开发模式】手机号 ${phone} 的验证码是: ${code}`)
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境下返回验证码
      ...(process.env.NODE_ENV === 'development' && { code })
    })
  } catch (error) {
    console.error('发送短信失败:', error)
    return NextResponse.json(
      { error: '发送失败，请稍后重试' },
      { status: 500 }
    )
  }
}
