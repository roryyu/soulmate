import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Database, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditTocDataPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const tocData = await prisma.tocData.findUnique({
    where: { id: params.id },
  });

  if (!tocData) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Link
          href="/admin/toc-data"
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">TocData 详情</h1>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">ID</p>
              <p className="text-slate-900 font-mono font-semibold">{tocData.id}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-500 text-sm mb-1">Key (TOS 路径)</label>
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-slate-700 font-mono text-sm break-all">
                {tocData.key || '-'}
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-sm mb-1">ETag</label>
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-slate-700 font-mono text-sm break-all">
                {tocData.etag || '-'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-sm mb-1">创建时间</label>
                <div className="bg-slate-50 rounded-xl px-4 py-3 text-slate-700 text-sm">
                  {new Date(tocData.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <div>
                <label className="block text-slate-500 text-sm mb-1">更新时间</label>
                <div className="bg-slate-50 rounded-xl px-4 py-3 text-slate-700 text-sm">
                  {new Date(tocData.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Link
            href="/admin/toc-data"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
        </div>
      </div>
    </div>
  );
}
