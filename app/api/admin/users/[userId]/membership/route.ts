import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 管理端：查询指定用户当前有效会员（用于管理端展示/校验）
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const now = new Date()
  const membership = await prisma.userMembership.findFirst({
    where: { userId: params.userId, status: 'ACTIVE', endAt: { gt: now } },
    include: { product: true },
    orderBy: { endAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    membership: membership
      ? {
          id: membership.id,
          startAt: membership.startAt,
          endAt: membership.endAt,
          productName: membership.product?.name ?? null,
          productType: membership.product?.type ?? null,
        }
      : null,
  })
}

// 管理端：手动给用户增加会员时长（按天）
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const body = await request.json()
  const { days } = body as { days?: number }

  if (days === undefined || isNaN(days) || parseInt(String(days)) <= 0) {
    return NextResponse.json({ error: 'days 必须为正整数（单位：天）' }, { status: 400 })
  }

  const userExists = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!userExists) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  const now = new Date()
  const addDays = parseInt(String(days))

  const updated = await prisma.$transaction(async (tx) => {
    // 中文注释：先把“已过期但仍标记为 ACTIVE”的记录清理为 EXPIRED，避免出现多个 ACTIVE 干扰展示
    await tx.userMembership.updateMany({
      where: { userId: params.userId, status: 'ACTIVE', endAt: { lte: now } },
      data: { status: 'EXPIRED' },
    })

    // 中文注释：优先延长当前有效会员；如果没有有效会员则新建一条“人工赠送”的有效会员记录（productId 为空）
    const active = await tx.userMembership.findFirst({
      where: { userId: params.userId, status: 'ACTIVE', endAt: { gt: now } },
      orderBy: { endAt: 'desc' },
    })

    const baseEndAt = active?.endAt ?? now
    const newEndAt = new Date(baseEndAt.getTime() + addDays * 24 * 60 * 60 * 1000)

    const membership = active
      ? await tx.userMembership.update({
          where: { id: active.id },
          data: { endAt: newEndAt },
        })
      : await tx.userMembership.create({
          data: {
            userId: params.userId,
            productId: null,
            orderId: null,
            startAt: now,
            endAt: newEndAt,
            status: 'ACTIVE',
          },
        })

    return membership
  })

  return NextResponse.json({
    success: true,
    membership: {
      id: updated.id,
      startAt: updated.startAt,
      endAt: updated.endAt,
    },
  })
}

