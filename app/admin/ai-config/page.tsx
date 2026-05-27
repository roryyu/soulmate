import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sliders } from 'lucide-react';
import AIConfigEditor from './ai-config-editor';

export const dynamic = 'force-dynamic';

// 操作类型预设描述
const OPERATION_DEFAULTS: Record<string, string> = {
  IDEATION: '选题灵感生成',
  SEARCH: 'CNKI 检索式生成',
  ANALYZE: '文献智能分析',
  CHAT: '文献问答对话',
  WRITING: '研究写作生成',
  POLISHING: '论文润色操作',
  OUTLINE: '综述大纲生成',
  OCR_UPLOAD: '文献上传 PDF OCR（按页数分档）',
};

export default async function AIConfigPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const configs = await prisma.aIOperationConfig.findMany({
    orderBy: { operationType: 'asc' },
  });

  // 确保所有预设操作类型都出现（即使 DB 中还没有）
  const configMap = Object.fromEntries(configs.map((c) => [c.operationType, c]));
  const allConfigs = Object.keys(OPERATION_DEFAULTS).map((opType) => ({
    operationType: opType,
    creditCost: configMap[opType]?.creditCost ?? 10,
    description: configMap[opType]?.description ?? OPERATION_DEFAULTS[opType],
    isActive: configMap[opType]?.isActive ?? true,
    exists: Boolean(configMap[opType]),
  }));

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI 操作积分配置</h1>
              <p className="text-slate-400 text-sm">
                配置各 AI 功能消耗的积分；其中「PDF OCR」按每 100 页一档计价，单价见该项配置
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin/orders" className="text-slate-400 hover:text-white text-sm transition-colors">订单管理</Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/products" className="text-slate-400 hover:text-white text-sm transition-colors">产品管理</Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/system-settings" className="text-slate-400 hover:text-white text-sm transition-colors">系统配置</Link>
          </div>
        </div>

        {/* 说明 */}
        <div className="mb-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-purple-300 text-sm">
          会员用户在有效期内使用 AI 功能<strong>不消耗积分</strong>。非会员用户每次调用 AI 功能将按此配置扣减积分。
          设置为 0 或停用该配置，则所有用户免费使用该功能。
        </div>

        {/* 配置列表 */}
        <div className="space-y-3">
          {allConfigs.map((config) => (
            <AIConfigEditor key={config.operationType} config={config} />
          ))}
        </div>
      </div>
    </div>
  );
}
