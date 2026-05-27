import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

// 获取租户列表
// POST /api/tenants
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { tenantId, tenantName } = data;

    // 构建查询条件
    const where = {
      ...(tenantId && { id: tenantId }),
      ...(tenantName && { name: { contains: tenantName, mode: 'insensitive' } }),
    };

    // 查询租户列表并包含产品信息
    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            userLimit: true,
            creditLimit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 格式化返回数据
    const formattedTenants = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name || '',
      productName: tenant.product?.name || '',
      userLimit: tenant.product?.userLimit || 0,
      creditLimit: tenant.product?.creditLimit || 0,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTenants,
      total: formattedTenants.length
    });
  } catch (error) {
    console.error('获取租户列表错误:', error);
    return NextResponse.json({ error: '获取租户列表失败' }, { status: 500 });
  }
}
