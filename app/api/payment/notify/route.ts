import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyNotifySign, handlePaymentSuccess } from '@/lib/alipay';

// 支付宝异步通知接口
export async function POST(request: NextRequest) {
  try {
    // 获取 POST 参数
    const formData = await request.formData();
    const params: Record<string, any> = {};
    
    formData.forEach((value, key) => {
      params[key] = value;
    });

    console.log('收到支付宝异步通知:', params);

    const { out_trade_no, trade_no, trade_status } = params;

    // 1. 验证签名和参数
    const signValid = await verifyNotifySign(params);
    if (!signValid) {
      console.error('验签失败');
      return new NextResponse('failure', { status: 400 });
    }

    // 2. 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { outTradeNo: out_trade_no },
    });

    if (!order) {
      console.error('订单不存在:', out_trade_no);
      return new NextResponse('failure', { status: 404 });
    }

    // 3. 处理不同的交易状态
    switch (trade_status) {
      case 'TRADE_SUCCESS':
      case 'TRADE_FINISHED':
        // 只有订单状态为 PENDING 时才处理
        if (order.status === 'PENDING') {
          await handlePaymentSuccess(out_trade_no, trade_no, params);
          console.log('支付成功，订单已更新:', out_trade_no);
        }
        break;
      
      case 'WAIT_BUYER_PAY':
        // 交易创建，等待买家付款，不做处理
        console.log('等待买家付款:', out_trade_no);
        break;
      
      case 'TRADE_CLOSED':
        // 交易关闭，更新订单状态
        await prisma.order.update({
          where: { outTradeNo: out_trade_no },
          data: { status: 'CANCELLED' },
        });
        console.log('交易已关闭:', out_trade_no);
        break;
    }

    // 4. 返回 success 给支付宝，防止重复通知
    return new NextResponse('success');
  } catch (error) {
    console.error('处理支付宝异步通知失败:', error);
    return new NextResponse('failure', { status: 500 });
  }
}