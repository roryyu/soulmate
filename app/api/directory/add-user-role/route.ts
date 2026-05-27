import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 添加目录用户角色关联
// POST /api/directory/add-user-role
export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { directoryId, roleId, userIds } = data;
    const userId = (auth.session as { user: { id: string } }).user.id;

    // 验证必填字段
    if (!directoryId) {
      return NextResponse.json({ error: '目录ID不能为空' }, { status: 400 });
    }
    if (!roleId) {
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
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

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    // 检查所有用户是否存在且属于同一租户
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        tenantId,
      },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: '存在无效的用户ID或用户不属于当前租户' }, { status: 400 });
    }

    // 使用事务批量处理用户角色关联
    const results = await prisma.$transaction(async (tx) => {
      const processedResults = [];

      for (const userIdToAssign of userIds) {
        // 检查是否已存在关联记录
        const existingRecord = await tx.directoryUserRole.findFirst({
          where: {
            directoryId,
            userId: userIdToAssign,
          },
        });

        if (existingRecord) {
          // 更新现有记录的角色
          const updatedRecord = await tx.directoryUserRole.update({
            where: { id: existingRecord.id },
            data: {
              roleId,
              updatedAt: new Date(),
            },
          });
          processedResults.push({
            userId: userIdToAssign,
            action: 'updated',
            record: updatedRecord,
          });
        } else {
          // 创建新的关联记录
          const newRecord = await tx.directoryUserRole.create({
            data: {
              directoryId,
              userId: userIdToAssign,
              roleId,
            },
          });
          processedResults.push({
            userId: userIdToAssign,
            action: 'created',
            record: newRecord,
          });
        }
      }

      return processedResults;
    });

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      createdCount: results.filter((r) => r.action === 'created').length,
      updatedCount: results.filter((r) => r.action === 'updated').length,
    });
  } catch (error) {
    console.error('添加目录用户角色关联错误:', error);
    return NextResponse.json({ error: '添加目录用户角色关联失败' }, { status: 500 });
  }
}
