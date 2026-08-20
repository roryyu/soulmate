import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 编辑目录
// PUT /api/directory/edit/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { name, parentId, description } = data;
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

    // 如果有父目录，检查父目录是否存在且属于同一租户
    if (parentId) {
      // 检查不能将目录设置为自身的子目录
      if (parentId === directoryId) {
        return NextResponse.json({ error: '不能将目录设置为自身的子目录' }, { status: 400 });
      }

      // 检查不能形成循环引用
      let currentParentId = parentId;
      while (currentParentId) {
        const parent = await prisma.directory.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        if (!parent) {
          break;
        }
        if (parent.parentId === directoryId) {
          return NextResponse.json({ error: '不能形成目录循环引用' }, { status: 400 });
        }
        currentParentId = parent.parentId;
      }

      const parentDirectory = await prisma.directory.findUnique({
        where: { id: parentId },
        select: { tenantId: true },
      });

      if (!parentDirectory) {
        return NextResponse.json({ error: '父目录不存在' }, { status: 404 });
      }

      if (parentDirectory.tenantId !== tenantId) {
        return NextResponse.json({ error: '无权访问该父目录' }, { status: 403 });
      }
    }

    // 更新目录信息
    const updatedDirectory = await prisma.directory.update({
      where: { id: directoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId }),
        ...(description !== undefined && { description }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      directory: updatedDirectory,
    });
  } catch (error) {
    console.error('编辑目录错误:', error);
    return NextResponse.json({ error: '编辑目录失败' }, { status: 500 });
  }
}
