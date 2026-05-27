import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Crown, Zap, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

// 状态对应样式
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待支付', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  PAID: { label: '已支付', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  CANCELLED: { label: '已取消', className: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  REFUNDED: { label: '已退款', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const PRODUCT_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  MEMBERSHIP: { label: '会员套餐', icon: <Crown className="w-3 h-3 text-amber-400" /> },
  CREDIT_PACKAGE: { label: '积分包', icon: <Zap className="w-3 h-3 text-cyan-400" /> },
  SINGLE_PURCHASE: { label: '单次购买', icon: <ShoppingBag className="w-3 h-3 text-slate-400" /> },
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const page = Math.max(1, parseInt(searchParams.page ?? '1'));
  const pageSize = 20;
  const status = searchParams.status;

  const where = status ? { status } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const statuses = ['', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">订单管理</h1>
            <p className="text-slate-400 text-sm mt-1">共 {total} 条订单</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin/products" className="text-slate-400 hover:text-white text-sm transition-colors">产品管理</Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/ai-config" className="text-slate-400 hover:text-white text-sm transition-colors">操作配置</Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/system-settings" className="text-slate-400 hover:text-white text-sm transition-colors">系统配置</Link>
          </div>
        </div>

        {/* 状态筛选 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {statuses.map((s) => {
            const info = s ? STATUS_MAP[s] : null;
            const isActive = (status ?? '') === s;
            return (
              <Link
                key={s}
                href={s ? `/admin/orders?status=${s}` : '/admin/orders'}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                {info ? info.label : '全部'}
              </Link>
            );
          })}
        </div>

        {/* 表格 */}
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">订单号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">用户</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">商品</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">金额</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {orders.map((order) => {
                  const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, className: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
                  const productTypeInfo = order.product?.type ? PRODUCT_TYPE_MAP[order.product.type] : null;

                  return (
                    <tr key={order.id} className="bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-300">{order.outTradeNo}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{order.subject}</div>
                      </td>
                      <td className="px-4 py-3">
                        {order.user ? (
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <div>
                              <div className="text-slate-200 text-sm">{order.user.name ?? '—'}</div>
                              <div className="text-slate-500 text-xs">{order.user.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-sm">游客</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {order.product ? (
                          <div className="flex items-center gap-1.5">
                            {productTypeInfo?.icon}
                            <span className="text-slate-200 text-sm">{order.product.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        ¥{parseFloat(order.totalAmount.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {order.createdAt.toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 text-slate-500">暂无订单数据</div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/admin/orders?page=${p}${status ? `&status=${status}` : ''}`}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${
                  p === page
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
