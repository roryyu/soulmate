import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 管理端：读取全部 AI 操作积分消耗配置
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const configs = await prisma.aIOperationConfig.findMany({
    orderBy: { operationType: 'asc' },
  });

  return NextResponse.json({ success: true, configs });
}
