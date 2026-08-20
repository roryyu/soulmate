import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询当前用户的历史订单
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '10'));
    const status = searchParams.get('status'); // 可选按状态过滤

    const where = {
      userId: session.user.id,
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, type: true, credits: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    // 金额转 number，避免 Decimal 序列化问题
    const serialized = orders.map((o) => ({
      ...o,
      totalAmount: parseFloat(o.totalAmount.toString()),
    }));

    return NextResponse.json({
      success: true,
      orders: serialized,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
