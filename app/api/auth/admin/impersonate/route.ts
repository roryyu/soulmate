import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 检查当前用户是否是管理员
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '未授权，只有管理员可以模拟用户登录' },
        { status: 403 }
      )
    }

    // 获取要模拟的用户ID
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      )
    }

    // 查找要模拟的用户
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 返回成功响应，包含目标用户信息
    // 前端将使用这些信息重新登录
    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        phone: targetUser.phone,
        isImpersonating: true,
        impersonatedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        }
      }
    })
  } catch (error) {
    console.error('模拟用户登录错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
