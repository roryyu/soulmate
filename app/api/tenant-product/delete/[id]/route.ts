import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 删除租户产品
// DELETE /api/tenant-product/delete/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
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

    // 检查是否有租户正在使用该产品
    const tenantCount = await prisma.tenant.count({
      where: { productId },
    });

    if (tenantCount > 0) {
      return NextResponse.json({ error: '该产品正在被租户使用，无法删除' }, { status: 400 });
    }

    // 删除产品
    await prisma.tenantProduct.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: '租户产品已成功删除',
    });
  } catch (error) {
    console.error('删除租户产品错误:', error);
    return NextResponse.json({ error: '删除租户产品失败' }, { status: 500 });
  }
}
