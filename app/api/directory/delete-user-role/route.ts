import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 删除目录用户角色关联
// POST /api/directory/delete-user-role
export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { directoryId, userIds } = data;
    const userId = (auth.session as { user: { id: string } }).user.id;

    // 验证必填字段
    if (!directoryId) {
      return NextResponse.json({ error: '目录ID不能为空' }, { status: 400 });
    }
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '用户ID列表不能为空' }, { status: 400 });
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

    // 批量删除用户角色关联
    const deleteResult = await prisma.directoryUserRole.deleteMany({
      where: {
        directoryId,
        userId: { in: userIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功删除 ${deleteResult.count} 条用户角色关联记录`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('删除目录用户角色关联错误:', error);
    return NextResponse.json({ error: '删除目录用户角色关联失败' }, { status: 500 });
  }
}
