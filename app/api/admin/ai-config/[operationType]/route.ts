import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 管理端：更新单项 AI 操作积分消耗配置
export async function PUT(
  request: NextRequest,
  { params }: { params: { operationType: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { creditCost, description, isActive } = body;

  if (creditCost === undefined && description === undefined && isActive === undefined) {
    return NextResponse.json({ error: '至少提供一个要更新的字段' }, { status: 400 });
  }

  if (creditCost !== undefined && (isNaN(creditCost) || creditCost < 0)) {
    return NextResponse.json({ error: 'creditCost 必须为非负整数' }, { status: 400 });
  }

  // upsert：若配置不存在则创建
  const config = await prisma.aIOperationConfig.upsert({
    where: { operationType: params.operationType },
    update: {
      ...(creditCost !== undefined && { creditCost: parseInt(creditCost) }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    create: {
      operationType: params.operationType,
      creditCost: creditCost !== undefined ? parseInt(creditCost) : 10,
      description: description ?? null,
      isActive: isActive !== false,
    },
  });

  return NextResponse.json({ success: true, config });
}
