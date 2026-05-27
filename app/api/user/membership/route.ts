import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询当前用户会员状态
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const now = new Date();

    // 查询当前有效会员（status=ACTIVE 且未到期）
    const activeMembership = await prisma.userMembership.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
        endAt: { gt: now },
      },
      include: { product: true },
      orderBy: { endAt: 'desc' },
    });

    // 查询历史会员记录
    const historyMemberships = await prisma.userMembership.findMany({
      where: {
        userId: session.user.id,
        NOT: { status: 'ACTIVE' },
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      membership: activeMembership
        ? {
            id: activeMembership.id,
            status: activeMembership.status,
            startAt: activeMembership.startAt,
            endAt: activeMembership.endAt,
            // 剩余天数
            remainingDays: Math.ceil(
              (activeMembership.endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
            product: activeMembership.product
              ? {
                  id: activeMembership.product.id,
                  name: activeMembership.product.name,
                  type: activeMembership.product.type,
                }
              : null,
          }
        : null,
      history: historyMemberships.map((m) => ({
        id: m.id,
        status: m.status,
        startAt: m.startAt,
        endAt: m.endAt,
        productName: m.product?.name ?? null,
      })),
    });
  } catch (error) {
    console.error('查询会员状态失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
