import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TocDataForm from '../toc-data-form';

export const dynamic = 'force-dynamic';

export default async function NewTocDataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

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
        <h1 className="text-3xl font-bold text-slate-900 mb-6">上传文件</h1>
        <p className="text-slate-500 text-sm mb-6">上传文件后，系统会自动将文件存储到 TOS 并记录 key 和 etag</p>
        <TocDataForm />
      </div>
    </div>
  );
}
