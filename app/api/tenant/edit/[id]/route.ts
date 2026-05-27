import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 编辑租户信息
// PUT /api/tenant/edit/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, productId } = body;
    const tenantId = params.id;

    // 验证必填字段
    if (!tenantId) {
      return NextResponse.json({ error: '租户ID不能为空' }, { status: 400 });
    }

    if (!name || !productId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查租户是否存在
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: '租户不存在' }, { status: 404 });
    }

    // 检查产品是否存在
    const existingProduct = await prisma.tenantProduct.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: '产品不存在' }, { status: 400 });
    }

    // 更新租户信息
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name,
        productId,
        updatedAt: new Date(), // 显式更新updatedAt字段
      },
      include: {
        product: {
          select: {
            name: true,
            userLimit: true,
            creditLimit: true,
          },
        },
      },
    });

    // 格式化返回数据
    const formattedTenant = {
      id: updatedTenant.id,
      name: updatedTenant.name || '',
      productId: updatedTenant.productId,
      productName: updatedTenant.product?.name || '',
      userLimit: updatedTenant.product?.userLimit || 0,
      creditLimit: updatedTenant.product?.creditLimit || 0,
      createdAt: updatedTenant.createdAt,
      updatedAt: updatedTenant.updatedAt,
    };

    return NextResponse.json({
      success: true,
      tenant: formattedTenant,
    });
  } catch (error) {
    console.error('编辑租户错误:', error);
    return NextResponse.json({ error: '编辑租户失败' }, { status: 500 });
  }
}
