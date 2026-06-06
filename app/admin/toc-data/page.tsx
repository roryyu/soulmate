import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Database, Plus, Download, ArrowLeft } from 'lucide-react';
import TocDataActions from './toc-data-actions';
import TocDataDownload from './toc-data-download';

export const dynamic = 'force-dynamic';

export default async function AdminTocDataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const tocDataList = await prisma.tocData.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const getFileName = (key: string | null) => {
    if (!key) return '-';
    const parts = key.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">TocData 管理</h1>
            <p className="text-slate-500 text-sm mt-1">管理 TOS 上传文件数据</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/toc-data/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-sm font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              上传文件
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {tocDataList.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg">
                <Database className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-slate-900 font-semibold text-sm">
                    {item.name || getFileName(item.key)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono">
                    {item.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                  <span className="truncate max-w-xs">
                    Key: <span className="text-slate-700 font-mono">{item.key || '-'}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  上传于 {new Date(item.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TocDataDownload tocDataId={item.id} fileName={getFileName(item.key)} />
                <TocDataActions tocDataId={item.id} />
              </div>
            </div>
          ))}
        </div>

        {tocDataList.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Database className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-400 text-lg">暂无数据</p>
            <p className="text-slate-400 text-sm mt-1">点击「上传文件」开始添加</p>
          </div>
        )}
      </div>
    </div>
  );
}
