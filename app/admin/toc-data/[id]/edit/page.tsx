import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import AdminPageHeader from '@/components/layout/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function EditTocDataPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const tocData = await prisma.tocData.findUnique({
    where: { id: params.id },
  });

  if (!tocData) notFound();

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader subtitle="文件详情" backHref="/admin/toc-data" backLabel="返回列表" />
      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">文件详情</h2>
        </div>

        <div className="border border-[#dddddd] rounded-[14px] p-6 space-y-5">
          <div>
            <p className="text-[12px] text-[#929292] uppercase tracking-wider mb-1">ID</p>
            <p className="text-[14px] text-[#222222] font-mono font-medium">{tocData.id}</p>
          </div>

          <div>
            <p className="text-[12px] text-[#929292] uppercase tracking-wider mb-1">Key (TOS 路径)</p>
            <div className="bg-[#f7f7f7] rounded-lg px-4 py-3 text-[13px] text-[#3f3f3f] font-mono break-all">
              {tocData.key || '-'}
            </div>
          </div>

          <div>
            <p className="text-[12px] text-[#929292] uppercase tracking-wider mb-1">ETag</p>
            <div className="bg-[#f7f7f7] rounded-lg px-4 py-3 text-[13px] text-[#3f3f3f] font-mono break-all">
              {tocData.etag || '-'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] text-[#929292] uppercase tracking-wider mb-1">创建时间</p>
              <div className="bg-[#f7f7f7] rounded-lg px-4 py-3 text-[13px] text-[#3f3f3f]">
                {new Date(tocData.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <div>
              <p className="text-[12px] text-[#929292] uppercase tracking-wider mb-1">更新时间</p>
              <div className="bg-[#f7f7f7] rounded-lg px-4 py-3 text-[13px] text-[#3f3f3f]">
                {new Date(tocData.updatedAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
