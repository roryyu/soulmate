import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import {
  getNewUserGiftCredits,
  getLiteratureReviewRagTopK,
  MIN_LITERATURE_REVIEW_RAG_TOP_K,
  MAX_LITERATURE_REVIEW_RAG_TOP_K,
} from '@/lib/system-settings';
import SystemSettingsForm from './system-settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSystemSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const newUserGiftCredits = await getNewUserGiftCredits();
  const literatureReviewRagTopK = await getLiteratureReviewRagTopK();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">系统配置</h1>
              <p className="text-slate-400 text-sm">全局业务参数，后续可在此继续增加配置项</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href="/admin/orders" className="text-slate-400 hover:text-white text-sm transition-colors">
              订单管理
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/products" className="text-slate-400 hover:text-white text-sm transition-colors">
              产品管理
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/ai-config" className="text-slate-400 hover:text-white text-sm transition-colors">
              操作配置
            </Link>
          </div>
        </div>

        <div className="mb-4 p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-200/90 text-sm">
          修改后对新创建的用户立即生效；已注册用户余额不会回溯调整。
        </div>

        <SystemSettingsForm
          initialNewUserGiftCredits={newUserGiftCredits}
          initialLiteratureReviewRagTopK={literatureReviewRagTopK}
          literatureReviewRagTopKMin={MIN_LITERATURE_REVIEW_RAG_TOP_K}
          literatureReviewRagTopKMax={MAX_LITERATURE_REVIEW_RAG_TOP_K}
        />
      </div>
    </div>
  );
}
