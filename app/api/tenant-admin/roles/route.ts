import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询角色列表（租户管理员版本）
// GET /api/tenant-admin/roles
export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    // 查询角色列表
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      roles,
      total: roles.length,
    });
  } catch (error) {
    console.error('查询角色错误:', error);
    return NextResponse.json({ error: '查询角色失败' }, { status: 500 });
  }
}
