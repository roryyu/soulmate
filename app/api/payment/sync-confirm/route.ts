import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyNotifySign, handlePaymentSuccess } from '@/lib/alipay';

export const dynamic = 'force-dynamic';

/**
 * 电脑网站支付同步回跳：支付宝通过 GET 带参跳转到 return_url。
 * 本地开发时 notify_url 指向 localhost，支付宝服务器无法访问，订单永远不会被异步通知更新。
 * 此处对同步参数验签后与异步通知一致地更新订单（幂等：已 PAID 则跳过）。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (!params.out_trade_no || !params.sign) {
      return NextResponse.json(
        { ok: false, error: '缺少同步回跳参数' },
        { status: 400 }
      );
    }

    const signOk = await verifyNotifySign(params);
    if (!signOk) {
      return NextResponse.json({ ok: false, error: '验签失败' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { outTradeNo: params.out_trade_no },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: '订单不存在' }, { status: 404 });
    }

    if (order.status === 'PENDING' && params.trade_no) {
      await handlePaymentSuccess(params.out_trade_no, params.trade_no, {
        ...params,
        trade_status: params.trade_status || 'TRADE_SUCCESS',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('同步回跳确认失败:', error);
    return NextResponse.json(
      { ok: false, error: '处理失败' },
      { status: 500 }
    );
  }
}
