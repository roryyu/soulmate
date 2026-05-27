import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 删除角色
// DELETE /api/role/delete/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const roleId = params.id;

    // 验证必填字段
    if (!roleId) {
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
    }

    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    // 检查是否有目录用户角色关联
    const directoryUserRoleCount = await prisma.directoryUserRole.count({
      where: { roleId },
    });

    if (directoryUserRoleCount > 0) {
      return NextResponse.json({ error: '该角色正在被使用，无法删除' }, { status: 400 });
    }

    // 删除角色
    await prisma.role.delete({
      where: { id: roleId },
    });

    return NextResponse.json({
      success: true,
      message: '角色已成功删除',
    });
  } catch (error) {
    console.error('删除角色错误:', error);
    return NextResponse.json({ error: '删除角色失败' }, { status: 500 });
  }
}
