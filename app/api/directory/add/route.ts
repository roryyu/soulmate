import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 添加目录
// POST /api/directory/add
export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { name, parentId, description } = data;
    const userId = auth.session.user.id;

    // 验证必填字段
    if (!name) {
      return NextResponse.json({ error: '目录名称不能为空' }, { status: 400 });
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

    // 如果有父目录，检查父目录是否存在且属于同一租户
    if (parentId) {
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

    // 创建目录
    const directory = await prisma.directory.create({
      data: {
        name,
        parentId,
        description,
        tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      directory,
    });
  } catch (error) {
    console.error('添加目录错误:', error);
    return NextResponse.json({ error: '添加目录失败' }, { status: 500 });
  }
}
