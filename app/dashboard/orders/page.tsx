import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Receipt, Crown, Zap, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
};

export default async function DashboardOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      product: { select: { name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard/settings"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="返回设置"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-slate-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">我的订单</h1>
            <p className="text-slate-400 text-sm">支付与套餐购买记录</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/payment"
            className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
          >
            去充值 / 开通会员
          </Link>
          <Link
            href="/dashboard/membership"
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500 transition-colors"
          >
            会员与积分
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-2xl bg-slate-900/40">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>暂无订单</p>
            <Link href="/payment" className="inline-block mt-4 text-sky-400 hover:underline text-sm">
              浏览套餐
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const type = o.product?.type;
              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {type === 'MEMBERSHIP' && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                      {type === 'CREDIT_PACKAGE' && <Zap className="w-4 h-4 text-cyan-400 shrink-0" />}
                      <span className="text-white font-medium truncate">{o.subject}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md border ${
                          o.status === 'PAID'
                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                            : o.status === 'PENDING'
                            ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                            : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs mt-1 font-mono">{o.outTradeNo}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {o.createdAt.toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-white shrink-0">
                    ¥{parseFloat(o.totalAmount.toString()).toFixed(2)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
