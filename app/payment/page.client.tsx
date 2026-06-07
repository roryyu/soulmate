'use client';

import { useState } from 'react';
import { Crown, Zap, Check, CreditCard, Star, Clock, Coins } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  type: string;
  duration: number | null;
  credits: number | null;
}

interface MembershipStatus {
  endAt: string;
  remainingDays: number;
  productName: string | null;
}

interface PaymentPageProps {
  products: Product[];
  membershipStatus: MembershipStatus | null;
  creditBalance: number;
}

// 中文注释：会员卡片金额展示（整数不写小数）
function formatMembershipYuan(n: number) {
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2);
}

// 中文注释：会员卡片展示的权益文案（与产品定价页红字一致）
const MEMBERSHIP_FEATURES = [
  '选题构思不限次',
  '文献检索支持',
  '文献速读与问答',
  '文献综述框架梳理',
  '数字疗愈写作支持',
  '数字疗愈润色与表达优化',
] as const;

export default function PaymentClientPage({
  products,
  membershipStatus,
  creditBalance,
}: PaymentPageProps) {
  const router = useRouter();
  const { status } = useSession();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  // 按类型分组
  const membershipProducts = products.filter((p) => p.type === 'MEMBERSHIP');
  const creditProducts = products.filter((p) => p.type === 'CREDIT_PACKAGE');

  const handlePay = async (product: Product) => {
    // 中文注释：兜底保护——即使未来该组件被复用到“非强制登录”的页面，也能确保未登录无法下单
    if (status !== 'authenticated') {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/payment')}`);
      return;
    }
    setLoadingProduct(product.id);
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          subject: product.name,
          body: product.description,
          totalAmount: product.price.toFixed(2),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 将支付宝返回的 HTML 表单注入并自动提交
        const div = document.createElement('div');
        div.innerHTML = data.paymentForm;
        document.body.appendChild(div);
        const form = div.querySelector('form');
        if (form) form.submit();
      } else {
        alert('创建订单失败，请重试');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setLoadingProduct(null);
    }
  };

  // 会员套餐的周期标签
  const getDurationLabel = (days: number | null) => {
    if (!days) return '';
    if (days <= 31) return '月';
    if (days <= 100) return '季';
    return '年';
  };

  // 是否为推荐（季度/年度）
  const isRecommended = (product: Product) =>
    product.duration !== null && product.duration > 31;

  // 中文注释：是否展示数据库配置的原价划线（须高于早鸟价）
  const showOriginal = (p: Product) =>
    p.originalPrice != null && p.originalPrice > p.price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 px-4">
      {/* 顶部标题 */}
      <div className="max-w-5xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
          <Crown className="w-4 h-4" />
          Soulmates · 会员中心
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          解锁数字疗愈支持全流程
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          从教学真实问题出发，逐步完成选题构思，文献检索，要点提炼，综述梳理，写作与优化六个数字疗愈流程全环节
        </p>

        {/* 当前状态栏 */}
        {(membershipStatus || creditBalance > 0) && (
          <div className="mt-6 inline-flex items-center gap-4 bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-3 text-sm" style={{ display: 'none' }}>
            {membershipStatus ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <Crown className="w-4 h-4" />
                <span>
                  {membershipStatus.productName ?? '会员'} · 剩余 {membershipStatus.remainingDays} 天
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <Crown className="w-4 h-4" />
                <span>暂无会员</span>
              </div>
            )}
            <div className="w-px h-4 bg-slate-600" />
            <div className="flex items-center gap-2 text-amber-400">
              <Coins className="w-4 h-4" />
              <span>{creditBalance.toLocaleString()} 积分</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 会员套餐区 ── */}
      {membershipProducts.length > 0 && (
        <section className="max-w-5xl mx-auto mb-16">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
            <Crown className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-xl font-semibold text-white">
              会员套餐 · 会员期间所有 AI 功能免费使用，不消耗积分
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {membershipProducts.map((product) => {
              const recommended = isRecommended(product);
              const isSelected = selectedProduct === product.id;
              const isLoading = loadingProduct === product.id;

              return (
                <div
                  key={product.id}
                  className={`relative rounded-2xl border transition-all duration-200 cursor-pointer group ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/5 shadow-lg shadow-amber-500/10'
                      : recommended
                      ? 'border-slate-600 bg-slate-800/50 hover:border-amber-500/50'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedProduct(product.id)}
                >
                  {/* 推荐徽章 */}
                  {recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      推荐
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-semibold text-lg">{product.name}</h3>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                          <Check className="w-3 h-3 text-slate-900" />
                        </div>
                      )}
                    </div>

                    {product.description && (
                      <p className="text-slate-400 text-sm mb-4">{product.description}</p>
                    )}

                    <div className="mb-4">
                      {showOriginal(product) && (
                        <p className="text-slate-500 text-lg mb-1 line-through">
                          {/* 中文注释：划线价为原价，与早鸟价形成对比 */}
                          原价 ¥{formatMembershipYuan(product.originalPrice!)}
                        </p>
                      )}
                      <div className="flex items-end gap-2 flex-wrap">
                        <span className="text-xs text-amber-400/90 mb-1.5">早鸟价</span>
                        <span className="text-3xl font-bold text-white">
                          ¥{formatMembershipYuan(product.price)}
                        </span>
                        {product.duration && (
                          <span className="text-slate-400 text-sm mb-1">
                            /{getDurationLabel(product.duration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {product.duration && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4">
                        <Clock className="w-3.5 h-3.5" />
                        有效期 {product.duration} 天
                      </div>
                    )}

                    {/* 功能列表 */}
                    <ul className="space-y-2 mb-5">
                      {MEMBERSHIP_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-slate-300 text-sm">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      disabled={isLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePay(product);
                      }}
                      className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                        recommended
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <Loading type="inline" size="sm" isLoading={true} text="处理中..." />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          立即开通
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 积分包区 ── */}
      {creditProducts.length > 0 && (
        <section className="max-w-5xl mx-auto mb-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
            <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="text-xl font-semibold text-white">积分充值</h2>
            <span className="text-slate-500 text-sm">· 非会员可按需使用，按功能板块消耗积分</span>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {creditProducts.map((product) => {
              const isLoading = loadingProduct === product.id;
              const pricePerCredit =
                product.credits ? (product.price / product.credits).toFixed(3) : null;

              return (
                <div
                  key={product.id}
                  className="relative rounded-2xl border border-slate-700 bg-slate-800/30 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-200 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h3 className="text-white font-medium">{product.name}</h3>
                  </div>

                  {product.credits && (
                    <div className="text-2xl font-bold text-cyan-400 mb-1">
                      {product.credits.toLocaleString()}
                      <span className="text-sm font-normal text-slate-400 ml-1">积分</span>
                    </div>
                  )}

                  <div className="mb-4">
                    {showOriginal(product) && (
                      <p className="text-slate-500 text-sm line-through mb-0.5">
                        原价 ¥{product.originalPrice!.toFixed(2)}
                      </p>
                    )}
                    <div className="flex items-end justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs text-cyan-400/90">早鸟价</span>
                        <span className="text-xl font-semibold text-white">
                          ¥{product.price.toFixed(2)}
                        </span>
                      </div>
                      {pricePerCredit && (
                        <span className="text-slate-500 text-xs">约 ¥{pricePerCredit}/积分</span>
                      )}
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-slate-400 text-xs mb-4">{product.description}</p>
                  )}

                  <button
                    disabled={isLoading}
                    onClick={() => handlePay(product)}
                    className="w-full py-2 rounded-xl font-medium text-sm bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loading type="inline" size="sm" isLoading={true} text="处理中..." />
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        立即充值
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 中文注释：产品说明与免责，置于套餐与充值区块之后 */}
      {products.length > 0 && (
        <p className="max-w-3xl mx-auto text-center text-slate-500 text-sm leading-relaxed px-4">
          Soulmates用于中小学教师的课题研究梳理与表达支持，最终内容请结合教学实际，由教师本人审阅、修改与定稿
        </p>
      )}

      {products.length === 0 && (
        <div className="max-w-5xl mx-auto text-center py-20 text-slate-500">
          暂无上架产品，请稍后再试
        </div>
      )}
    </div>
  );
}
