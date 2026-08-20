import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 管理端：查询全部产品
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const serialized = products.map((p) => ({
    ...p,
    price: parseFloat(p.price.toString()),
    originalPrice:
      p.originalPrice != null ? parseFloat(p.originalPrice.toString()) : null,
  }));

  return NextResponse.json({ success: true, products: serialized });
}

// 管理端：新建产品
export async function POST(request: NextRequest) {
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

  if (!name || !price || !type) {
    return NextResponse.json({ error: '缺少必要参数：name、price、type' }, { status: 400 });
  }

  // 校验产品类型
  const validTypes = ['MEMBERSHIP', 'CREDIT_PACKAGE', 'SINGLE_PURCHASE'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `产品类型无效，有效值：${validTypes.join('、')}` },
      { status: 400 }
    );
  }

  // 会员套餐需要 duration
  if (type === 'MEMBERSHIP' && !duration) {
    return NextResponse.json({ error: '会员套餐需要设置 duration（天数）' }, { status: 400 });
  }

  // 积分包需要 credits
  if (type === 'CREDIT_PACKAGE' && !credits) {
    return NextResponse.json({ error: '积分包需要设置 credits（积分数量）' }, { status: 400 });
  }

  // 中文注释：原价可选；若填写则需为正数，且应不低于早鸟价（避免展示逻辑异常）
  const originalPriceNum =
    originalPrice !== undefined && originalPrice !== null && originalPrice !== ''
      ? parseFloat(originalPrice)
      : null;
  if (originalPriceNum != null && (Number.isNaN(originalPriceNum) || originalPriceNum <= 0)) {
    return NextResponse.json({ error: '原价须为大于 0 的数字' }, { status: 400 });
  }
  const salePrice = parseFloat(price);
  if (originalPriceNum != null && originalPriceNum < salePrice) {
    return NextResponse.json({ error: '原价不能低于早鸟价' }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price: salePrice,
      originalPrice: originalPriceNum,
      type,
      duration: duration ? parseInt(duration) : null,
      credits: credits ? parseInt(credits) : null,
      isActive: isActive !== false,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
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
