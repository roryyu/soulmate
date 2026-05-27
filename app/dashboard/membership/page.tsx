import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Crown, Clock, CheckCircle, XCircle, ArrowRight, Zap, TrendingUp, TrendingDown, Coins } from 'lucide-react';

export const dynamic = 'force-dynamic';

const TRANSACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  PURCHASE: { label: '购买充值', color: 'text-emerald-400' },
  CONSUME: { label: '功能消耗', color: 'text-slate-400' },
  REFUND: { label: '退款退积分', color: 'text-blue-400' },
  ADMIN_ADJUST: { label: '管理员调整', color: 'text-amber-400' },
};

const OPERATION_TYPE_MAP: Record<string, string> = {
  IDEATION: '选题生成',
  SEARCH: '检索式生成',
  ANALYZE: '文献分析',
  CHAT: '文献问答',
  WRITING: '研究写作',
  POLISHING: '论文润色',
  OUTLINE: '综述大纲',
  OCR_UPLOAD: 'PDF 文献 OCR',
};

export default async function MembershipPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');

  const now = new Date();

  // 中文注释：会员与积分合并为一个页面，服务端一次性取齐数据，减少页面内跳转与重复查询
  const [activeMembership, history, credit, transactions, totalConsumed, totalPurchased] = await Promise.all([
    // 当前有效会员
    prisma.userMembership.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE', endAt: { gt: now } },
      include: { product: true },
      orderBy: { endAt: 'desc' },
    }),
    // 历史会员记录
    prisma.userMembership.findMany({
      where: { userId: session.user.id },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // 积分余额
    prisma.userCredit.findUnique({ where: { userId: session.user.id } }),
    // 积分流水（最近 50 条）
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // 累计消耗
    prisma.creditTransaction.aggregate({
      where: { userId: session.user.id, type: 'CONSUME' },
      _sum: { amount: true },
    }),
    // 累计充值
    prisma.creditTransaction.aggregate({
      where: { userId: session.user.id, type: 'PURCHASE' },
      _sum: { amount: true },
    }),
  ]);

  const remainingDays = activeMembership
    ? Math.ceil((activeMembership.endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const balance = credit?.balance ?? 0;
  const consumed = Math.abs(totalConsumed._sum.amount ?? 0);
  const purchased = totalPurchased._sum.amount ?? 0;

  const statusColorMap: Record<string, string> = {
    ACTIVE: 'text-emerald-400',
    EXPIRED: 'text-slate-400',
    CANCELLED: 'text-red-400',
    RENEWED: 'text-amber-400',
  };

  const statusLabelMap: Record<string, string> = {
    ACTIVE: '有效',
    EXPIRED: '已到期',
    CANCELLED: '已取消',
    RENEWED: '已续期',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">会员与积分</h1>
            <p className="text-slate-400 text-sm">管理订阅状态、积分余额与流水</p>
          </div>
        </div>

        {/* 当前会员状态卡 */}
        <div
          className={`rounded-2xl border p-6 mb-6 ${
            activeMembership
              ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5'
              : 'border-slate-700 bg-slate-800/30'
          }`}
        >
          {activeMembership ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">会员有效</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {activeMembership.product?.name ?? '会员套餐'}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-amber-400">{remainingDays}</div>
                  <div className="text-slate-400 text-xs">剩余天数</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  开始：{activeMembership.startAt.toLocaleDateString('zh-CN')}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  到期：{activeMembership.endAt.toLocaleDateString('zh-CN')}
                </div>
              </div>

              {/* 进度条 */}
              {activeMembership.product?.duration && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>已使用</span>
                    <span>{activeMembership.product.duration - remainingDays} / {activeMembership.product.duration} 天</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((activeMembership.product.duration - remainingDays) /
                            activeMembership.product.duration) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <Link
                  href="/payment"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400/50 text-sm font-medium transition-all"
                >
                  <Crown className="w-4 h-4" />
                  续费会员
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400 font-medium">暂无有效会员</span>
              </div>
              <p className="text-slate-500 text-sm mb-5">
                开通会员后，即可在会员有效期内免费使用所有 AI 功能
              </p>
              <Link
                href="/payment"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                <Crown className="w-4 h-4" />
                立即开通会员
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>

        {/* 积分区块 */}
        <div id="credits" className="scroll-mt-24">
          {/* 中文注释：积分模块放在同一页，支持通过 #credits 锚点直接定位 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Coins className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">我的积分</h2>
              <p className="text-slate-500 text-sm">余额、累计统计与最近流水</p>
            </div>
          </div>

          {/* 余额卡片 */}
          <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-6 mb-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-slate-400 text-sm mb-1">当前积分余额</div>
                <div className="text-5xl font-bold text-white">{balance.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <Coins className="w-10 h-10 text-cyan-400/40 ml-auto" />
              </div>
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  累计充值
                </div>
                <div className="text-xl font-semibold text-white">{purchased.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  累计消耗
                </div>
                <div className="text-xl font-semibold text-white">{consumed.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/payment"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/50 text-sm font-medium transition-all"
              >
                <Zap className="w-4 h-4" />
                充值积分
              </Link>
              <Link
                href="/payment"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-medium transition-all"
              >
                <Crown className="w-4 h-4" />
                开通/续费会员
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 流水列表 */}
          <div className="mb-10">
            <h3 className="text-slate-300 font-medium mb-4 text-sm uppercase tracking-wider">
              积分流水 <span className="text-slate-600 normal-case font-normal">（最近 50 条）</span>
            </h3>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">暂无积分记录</div>
            ) : (
              <div className="space-y-2">
                {transactions.map((t) => {
                  const typeInfo = TRANSACTION_TYPE_MAP[t.type] ?? { label: t.type, color: 'text-slate-400' };
                  const opLabel = t.operationType ? OPERATION_TYPE_MAP[t.operationType] ?? t.operationType : null;
                  const isPositive = t.amount > 0;

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-700/60 bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isPositive ? 'bg-emerald-500/10' : 'bg-slate-700'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {t.description ?? (opLabel ? `使用 ${opLabel}` : typeInfo.label)}
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5">
                            {t.createdAt.toLocaleString('zh-CN')}
                            {t.balanceAfter !== undefined && (
                              <span className="ml-2 text-slate-600">余额 {t.balanceAfter.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-slate-300'}`}
                      >
                        {isPositive ? '+' : ''}
                        {t.amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 历史记录 */}
        {history.length > 0 && (
          <div>
            <h3 className="text-slate-300 font-medium mb-4 text-sm uppercase tracking-wider">
              订阅历史
            </h3>
            <div className="space-y-3">
              {history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/20"
                >
                  <div>
                    <div className="text-white text-sm font-medium">
                      {m.product?.name ?? '会员套餐'}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {m.startAt.toLocaleDateString('zh-CN')} ~ {m.endAt.toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${statusColorMap[m.status] ?? 'text-slate-400'}`}>
                    {statusLabelMap[m.status] ?? m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
