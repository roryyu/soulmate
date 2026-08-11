import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TocDataForm from '../toc-data-form';
import AdminPageHeader from '@/components/layout/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function NewTocDataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader subtitle="上传文件" backHref="/admin/toc-data" backLabel="返回列表" />
      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">上传文件</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1">
            支持多文件选择或拖拽文件夹批量上传，文件存储到 TOS 后由 AI 按文件名自动生成标签
          </p>
        </div>
        <TocDataForm />
      </main>
    </div>
  );
}
