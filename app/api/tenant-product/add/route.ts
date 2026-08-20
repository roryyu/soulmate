import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 添加租户产品
// POST /api/tenant-product/add
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { name, userLimit, creditLimit } = data;

    // 验证必填字段
    if (!name) {
      return NextResponse.json({ error: '产品名称不能为空' }, { status: 400 });
    }

    // 验证数值字段
    if (userLimit !== undefined && (isNaN(userLimit) || userLimit < 0)) {
      return NextResponse.json({ error: '用户限制必须是非负整数' }, { status: 400 });
    }

    if (creditLimit !== undefined && (isNaN(creditLimit) || creditLimit < 0)) {
      return NextResponse.json({ error: '积分限制必须是非负整数' }, { status: 400 });
    }

    // 创建租户产品
    const tenantProduct = await prisma.tenantProduct.create({
      data: {
        name,
        userLimit: userLimit || 0,
        creditLimit: creditLimit || 0,
      },
    });

    return NextResponse.json({
      success: true,
      tenantProduct,
    });
  } catch (error) {
    console.error('添加租户产品错误:', error);
    return NextResponse.json({ error: '添加租户产品失败' }, { status: 500 });
  }
}
