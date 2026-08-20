import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 管理端：查询全量订单列表
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20'));
  const status = searchParams.get('status');       // 按订单状态过滤
  const userId = searchParams.get('userId');       // 按用户过滤
  const keyword = searchParams.get('keyword');     // 按订单号/商品名搜索

  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (keyword) {
    where.OR = [
      { outTradeNo: { contains: keyword } },
      { subject: { contains: keyword } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, type: true } },
        paymentRecords: { select: { id: true, tradeStatus: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const serialized = orders.map((o) => ({
    ...o,
    totalAmount: parseFloat(o.totalAmount.toString()),
  }));

  return NextResponse.json({
    success: true,
    orders: serialized,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
