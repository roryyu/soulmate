import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询租户列表
// POST /api/tenant/find
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
    // 查询租户列表，包含产品信息
    const tenants = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            name: true,
            userLimit: true,
            creditLimit: true,
          },
        },
        // 计算租户下的用户数量
        _count: {
          select: { users: true },
        },
      },
    });

    // 格式化返回数据
    const formattedTenants = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name || '',
      productId: tenant.productId,
      productName: tenant.product?.name || '',
      userLimit: tenant.product?.userLimit || 0,
      creditLimit: tenant.product?.creditLimit || 0,
      userCount: tenant._count.users-1,// ???: 租户管理员是不占用户数的
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTenants,
      total: formattedTenants.length,
    });
  } catch (error) {
    console.error('查询租户错误:', error);
    return NextResponse.json({ error: '查询租户失败' }, { status: 500 });
  }
}
