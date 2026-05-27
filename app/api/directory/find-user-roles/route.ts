import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询目录的用户角色关联
// POST /api/directory/find-user-roles
export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { directoryId } = data;
    const userId = (auth.session as { user: { id: string } }).user.id;

    if (!directoryId) {
      return NextResponse.json({ error: '目录ID不能为空' }, { status: 400 });
    }

    // 获取当前用户的tenantId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ error: '当前用户没有所属租户' }, { status: 400 });
    }

    const tenantId = user.tenantId;

    // 检查目录是否存在且属于同一租户
    const directory = await prisma.directory.findUnique({
      where: { id: directoryId },
      select: { tenantId: true },
    });

    if (!directory) {
      return NextResponse.json({ error: '目录不存在' }, { status: 404 });
    }

    if (directory.tenantId !== tenantId) {
      return NextResponse.json({ error: '无权访问该目录' }, { status: 403 });
    }

    // 查询目录的用户角色关联
    const userRoles = await prisma.directoryUserRole.findMany({
      where: { directoryId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      userRoles,
      total: userRoles.length,
    });
  } catch (error) {
    console.error('查询目录用户角色错误:', error);
    return NextResponse.json({ error: '查询目录用户角色失败' }, { status: 500 });
  }
}
