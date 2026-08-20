import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询角色列表
// POST /api/role/find
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

    // 查询角色列表
    const roles = await prisma.role.findMany({
      where,
      include: {
        // 统计每个角色关联的目录用户角色数量
        _count: {
          select: { directoryUserRoles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 转换格式，便于前端使用
    const formattedRoles = roles.map((role) => ({
      ...role,
      usageCount: role._count.directoryUserRoles,
    }));

    return NextResponse.json({
      success: true,
      roles: formattedRoles,
      total: formattedRoles.length,
    });
  } catch (error) {
    console.error('查询角色错误:', error);
    return NextResponse.json({ error: '查询角色失败' }, { status: 500 });
  }
}
