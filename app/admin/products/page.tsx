import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Crown, Zap, ShoppingBag, Plus, Edit, EyeOff } from 'lucide-react';
import ProductActions from './product-actions';

export const dynamic = 'force-dynamic';

const TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  MEMBERSHIP: { label: '会员套餐', icon: <Crown className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  CREDIT_PACKAGE: { label: '积分包', icon: <Zap className="w-4 h-4" />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  SINGLE_PURCHASE: { label: '单次购买', icon: <ShoppingBag className="w-4 h-4" />, color: 'text-slate-300 bg-slate-500/10 border-slate-500/30' },
};

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { type: 'asc' }],
  });

  const serialized = products.map((p) => ({
    ...p,
    price: parseFloat(p.price.toString()),
    originalPrice:
      p.originalPrice != null ? parseFloat(p.originalPrice.toString()) : null,
  }));

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">产品管理</h1>
            <p className="text-slate-400 text-sm mt-1">管理会员套餐和积分包产品</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/admin/orders" className="text-slate-400 hover:text-white text-sm transition-colors">订单管理</Link>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <Link href="/admin/ai-config" className="text-slate-400 hover:text-white text-sm transition-colors">操作配置</Link>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <Link href="/admin/system-settings" className="text-slate-400 hover:text-white text-sm transition-colors">系统配置</Link>
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建产品
            </Link>
          </div>
        </div>

        {/* 产品列表 */}
        <div className="space-y-3">
          {serialized.map((product) => {
            const typeInfo = TYPE_MAP[product.type] ?? TYPE_MAP.SINGLE_PURCHASE;

            return (
              <div
                key={product.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  product.isActive
                    ? 'border-slate-700 bg-slate-800/30'
                    : 'border-slate-800 bg-slate-900/20 opacity-60'
                }`}
              >
                {/* 类型图标 */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${typeInfo.color}`}>
                  {typeInfo.icon}
                </div>

                {/* 产品信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{product.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {!product.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        已下架
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-slate-400 text-sm mt-0.5 truncate">{product.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    {product.duration && <span>有效期 {product.duration} 天</span>}
                    {product.credits && <span>赠送 {product.credits.toLocaleString()} 积分</span>}
                    <span>排序 {product.sortOrder}</span>
                  </div>
                </div>

                {/* 价格：原价划线 + 早鸟价（与支付页文案一致） */}
                <div className="text-right shrink-0">
                  {product.originalPrice != null &&
                    product.originalPrice > product.price && (
                      <div className="text-sm text-slate-500 line-through">
                        原价 ¥{product.originalPrice.toFixed(2)}
                      </div>
                    )}
                  <div className="text-xs text-amber-400/80">早鸟价</div>
                  <div className="text-xl font-bold text-white">
                    ¥{product.price.toFixed(2)}
                  </div>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    编辑
                  </Link>
                  <ProductActions productId={product.id} isActive={product.isActive} />
                </div>
              </div>
            );
          })}
        </div>

        {serialized.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无产品，点击「新建产品」开始添加</p>
          </div>
        )}
      </div>
    </div>
  );
}
