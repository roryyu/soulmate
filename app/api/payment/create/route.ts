import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
// authOptions 定义在 @/lib/auth，不是 route.ts
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPaymentForm, generateOutTradeNo } from '@/lib/alipay';

// 创建订单并发起支付
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { productId, subject, body: orderBody, totalAmount } = body;

    if (!subject || !totalAmount) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 生成商户订单号
    const outTradeNo = generateOutTradeNo();

    // 创建订单
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id,
        productId,
        outTradeNo,
        subject,
        body: orderBody,
        totalAmount: parseFloat(totalAmount),
        status: 'PENDING',
        expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟过期
      },
    });

    // 创建支付表单
    const paymentForm = createPaymentForm({
      outTradeNo,
      totalAmount,
      subject,
      body: orderBody,
      returnUrl: `${process.env.NEXTAUTH_URL}/payment/return`,
      notifyUrl: `${process.env.NEXTAUTH_URL}/api/payment/notify`,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      outTradeNo,
      paymentForm, // 返回的是 HTML 表单
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json(
      { error: '创建订单失败' },
      { status: 500 }
    );
  }
}