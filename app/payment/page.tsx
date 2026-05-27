import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import PaymentClientPage from './page.client';
import { redirect } from 'next/navigation';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default async function PaymentPage() {
  const session = await getServerSession(authOptions);

  // 中文注释：购买/充值页面必须登录；未登录直接跳转登录页，并带回跳地址
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/payment')}`);
  }

  // 获取所有上架的产品
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const serializedProducts = products.map((p) => ({
    ...p,
    price: parseFloat(p.price.toString()),
    originalPrice:
      p.originalPrice != null ? parseFloat(p.originalPrice.toString()) : null,
  }));

  // 获取当前用户会员和积分状态（未登录则为 null）
  let membershipStatus: null | { endAt: Date; remainingDays: number; productName: string | null } = null;
  let creditBalance = 0;

  if (session?.user?.id) {
    const now = new Date();
    const [membership, credit] = await Promise.all([
      prisma.userMembership.findFirst({
        where: { userId: session.user.id, status: 'ACTIVE', endAt: { gt: now } },
        include: { product: { select: { name: true } } },
        orderBy: { endAt: 'desc' },
      }),
      prisma.userCredit.findUnique({ where: { userId: session.user.id } }),
    ]);

    if (membership) {
      membershipStatus = {
        endAt: membership.endAt,
        remainingDays: Math.ceil(
          (membership.endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
        productName: membership.product?.name ?? null,
      };
    }
    creditBalance = credit?.balance ?? 0;
  }

  return (
    <PaymentClientPage
      products={serializedProducts}
      membershipStatus={
        membershipStatus
          ? {
              ...membershipStatus,
              endAt: membershipStatus.endAt.toISOString(),
            }
          : null
      }
      creditBalance={creditBalance}
    />
  );
}
