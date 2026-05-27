import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProductForm from '../product-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">新建产品</h1>
        <ProductForm />
      </div>
    </div>
  );
}
