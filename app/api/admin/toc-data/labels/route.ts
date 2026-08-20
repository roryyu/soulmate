import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 获取所有标签（含使用次数），按使用次数倒序
 * 用于列表页编辑标签时选择已使用过的标签
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const labels = await prisma.label.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { tocDataLabels: true } } },
  });

  const labelList = labels
    .map((label) => ({
      id: label.id,
      name: label.name,
      count: label._count.tocDataLabels,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ success: true, labelList });
}
