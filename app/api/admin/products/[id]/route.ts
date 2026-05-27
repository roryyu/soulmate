import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 管理端：编辑产品
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const {
    name,
    description,
    price,
    originalPrice,
    type,
    duration,
    credits,
    isActive,
    sortOrder,
  } = body;

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: '产品不存在' }, { status: 404 });
  }

  // 中文注释：更新原价时做与新建相同的校验
  let originalPricePatch: number | null | undefined;
  if (originalPrice !== undefined) {
    if (originalPrice === null || originalPrice === '') {
      originalPricePatch = null;
    } else {
      const n = parseFloat(originalPrice);
      if (Number.isNaN(n) || n <= 0) {
        return NextResponse.json({ error: '原价须为大于 0 的数字' }, { status: 400 });
      }
      originalPricePatch = n;
    }
  }

  const nextSalePrice =
    price !== undefined ? parseFloat(price) : parseFloat(existing.price.toString());
  // 中文注释：合并更新后的「有效原价」——未传 originalPrice 字段时沿用数据库原值
  const nextOriginalPrice =
    originalPrice !== undefined
      ? originalPricePatch ?? null
      : existing.originalPrice != null
        ? parseFloat(existing.originalPrice.toString())
        : null;
  if (nextOriginalPrice != null && nextOriginalPrice < nextSalePrice) {
    return NextResponse.json({ error: '原价不能低于早鸟价' }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(originalPrice !== undefined && { originalPrice: originalPricePatch }),
      ...(type !== undefined && { type }),
      ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
      ...(credits !== undefined && { credits: credits ? parseInt(credits) : null }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
    },
  });

  return NextResponse.json({
    success: true,
    product: {
      ...product,
      price: parseFloat(product.price.toString()),
      originalPrice:
        product.originalPrice != null
          ? parseFloat(product.originalPrice.toString())
          : null,
    },
  });
}

// 管理端：删除（下架）产品
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: '产品不存在' }, { status: 404 });
  }

  // 软下架而非物理删除，避免影响已有订单
  await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: '产品已下架' });
}
