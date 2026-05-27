import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 删除目录
// DELETE /api/directory/delete/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const directoryId = params.id;
    const userId = auth.session.user.id;

    // 验证必填字段
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
    const existingDirectory = await prisma.directory.findUnique({
      where: { id: directoryId },
      select: { tenantId: true },
    });

    if (!existingDirectory) {
      return NextResponse.json({ error: '目录不存在' }, { status: 404 });
    }

    if (existingDirectory.tenantId !== tenantId) {
      return NextResponse.json({ error: '无权访问该目录' }, { status: 403 });
    }

    // 使用事务删除目录及其所有子目录（级联删除）
    await prisma.$transaction(async (tx) => {
      // 首先删除所有子目录
      const deleteSubdirectories = async (parentId: string) => {
        const children = await tx.directory.findMany({
          where: { parentId },
          select: { id: true },
        });

        for (const child of children) {
          await deleteSubdirectories(child.id);
        }

        // 删除目录下的关联数据
        await tx.directoryUserRole.deleteMany({
          where: { directoryId: parentId },
        });

        // 删除目录下的文档
        await tx.document.deleteMany({
          where: { directoryId: parentId },
        });

        // 删除目录本身
        await tx.directory.delete({
          where: { id: parentId },
        });
      };

      await deleteSubdirectories(directoryId);
    });

    return NextResponse.json({
      success: true,
      message: '目录及其子目录已成功删除',
    });
  } catch (error) {
    console.error('删除目录错误:', error);
    return NextResponse.json({ error: '删除目录失败' }, { status: 500 });
  }
}
