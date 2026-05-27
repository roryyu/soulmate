import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
// authOptions 定义在 @/lib/auth，不是 route.ts
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 查询订单状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const outTradeNo = searchParams.get('outTradeNo');

    if (!outTradeNo) {
      return NextResponse.json(
        { error: '缺少订单号参数' },
        { status: 400 }
      );
    }

    // 查询本地订单
    const order = await prisma.order.findUnique({
      where: { outTradeNo },
      include: { product: true, paymentRecords: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: 404 }
      );
    }

    // 验证订单归属
    if (order.userId && order.userId !== session?.user?.id) {
      return NextResponse.json(
        { error: '无权访问此订单' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    return NextResponse.json(
      { error: '查询订单失败' },
      { status: 500 }
    );
  }
}