import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ProductForm from '../../product-form';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/');

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  const serialized = {
    ...product,
    price: parseFloat(product.price.toString()),
    originalPrice:
      product.originalPrice != null
        ? parseFloat(product.originalPrice.toString())
        : null,
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">编辑产品</h1>
        <ProductForm product={serialized} />
      </div>
    </div>
  );
}
