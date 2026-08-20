import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminAdjustCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 管理端：查询指定用户的积分余额与流水
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const credit = await prisma.userCredit.findUnique({ where: { userId: params.userId } });
  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    balance: credit?.balance ?? 0,
    transactions,
  });
}

// 管理端：手动调整指定用户积分
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { amount, description } = body;

  if (amount === undefined || isNaN(amount)) {
    return NextResponse.json({ error: 'amount 必须为整数（正数=充值，负数=扣减）' }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json({ error: '请填写调整原因 description' }, { status: 400 });
  }

  const userExists = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!userExists) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const result = await adminAdjustCredits(params.userId, parseInt(amount), description);

  return NextResponse.json({ success: true, newBalance: result.newBalance });
}
