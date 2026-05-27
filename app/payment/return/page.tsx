'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { CheckCircle, XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export default function PaymentReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [order, setOrder] = useState<any>(null);
  const pollCountRef = useRef(0);

  const outTradeNo = searchParams.get('out_trade_no');

  useEffect(() => {
    let cancelled = false;
    pollCountRef.current = 0;

    const maxPolls = 20; // 最多约 40 秒，避免无限「查询中」

    const queryOrder = async (tradeNo: string) => {
      try {
        const response = await fetch(
          `/api/payment/query?outTradeNo=${encodeURIComponent(tradeNo)}`
        );
        const data = await response.json();

        if (cancelled) return;

        if (data.success) {
          setOrder(data.order);
          if (data.order.status === 'PAID') {
            setStatus('success');
          } else if (data.order.status === 'CANCELLED') {
            setStatus('failed');
          } else {
            pollCountRef.current += 1;
            if (pollCountRef.current >= maxPolls) {
              setStatus('failed');
              return;
            }
            setTimeout(() => queryOrder(tradeNo), 2000);
          }
        } else {
          setStatus('failed');
        }
      } catch (error) {
        console.error('查询订单失败:', error);
        if (!cancelled) setStatus('failed');
      }
    };

    const run = async () => {
      // 支付宝同步回跳会带 sign；先走服务端验签并更新订单（解决 notify 无法访问 localhost 时订单一直 PENDING）
      if (typeof window !== 'undefined' && window.location.search.includes('sign=')) {
        try {
          await fetch(`/api/payment/sync-confirm${window.location.search}`);
        } catch (e) {
          console.error('同步回跳确认失败:', e);
        }
      }

      if (cancelled) return;

      if (outTradeNo) {
        queryOrder(outTradeNo);
      } else {
        setStatus('failed');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [outTradeNo]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">支付结果</CardTitle>
          <CardDescription>
            {status === 'loading' && '正在查询订单状态...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          {/* 居中加载状态 */}
          {status === 'loading' && <Loading type="inline" size="lg" isLoading={true} text="查询中" />}
          
          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">支付成功！</h2>
              {order && (
                <div className="mt-4 text-gray-600 space-y-2">
                  <p>订单号：{order.outTradeNo}</p>
                  <p>支付金额：¥{order.totalAmount}</p>
                </div>
              )}
            </div>
          )}
          
          {status === 'failed' && (
            <div className="text-center">
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">支付未完成</h2>
              <p className="text-gray-600">
                订单可能已取消或超时，请重新下单</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          {status === 'success' && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/membership')}
              >
                会员与积分
              </Button>
              <Button
                onClick={() => router.push('/research/dashboard')}
              >
                进入工作台
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}