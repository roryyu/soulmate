import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 编辑租户产品
// PUT /api/tenant-product/edit/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { name, userLimit, creditLimit } = data;
    const productId = params.id;

    // 验证必填字段
    if (!productId) {
      return NextResponse.json({ error: '产品ID不能为空' }, { status: 400 });
    }

    // 检查产品是否存在
    const existingProduct = await prisma.tenantProduct.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    // 验证数值字段
    if (userLimit !== undefined && (isNaN(userLimit) || userLimit < 0)) {
      return NextResponse.json({ error: '用户限制必须是非负整数' }, { status: 400 });
    }

    if (creditLimit !== undefined && (isNaN(creditLimit) || creditLimit < 0)) {
      return NextResponse.json({ error: '积分限制必须是非负整数' }, { status: 400 });
    }

    // 更新产品信息
    const updatedProduct = await prisma.tenantProduct.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name }),
        ...(userLimit !== undefined && { userLimit }),
        ...(creditLimit !== undefined && { creditLimit }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      tenantProduct: updatedProduct,
    });
  } catch (error) {
    console.error('编辑租户产品错误:', error);
    return NextResponse.json({ error: '编辑租户产品失败' }, { status: 500 });
  }
}
