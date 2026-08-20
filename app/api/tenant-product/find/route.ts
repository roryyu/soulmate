import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询租户产品列表
// POST /api/tenant-product/find
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { id, name } = data;

    // 构建查询条件
    const where = {
      ...(id && { id }),
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
    };
    // 查询租户产品列表（包含关联租户数量）
    const tenantProducts = await prisma.tenantProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tenants: true },
        },
      },
    });


    return NextResponse.json({
      success: true,
      data: tenantProducts,
      total: tenantProducts.length,
    });
  } catch (error) {
    console.error('查询租户产品错误:', error);
    return NextResponse.json({ error: '查询租户产品失败' }, { status: 500 });
  }
}
