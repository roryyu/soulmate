import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询目录下的文档（普通用户可用）
// GET /api/directory/get-documents?directoryId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const directoryId = searchParams.get('directoryId');
    const userId = session.user.id;

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

    // 查询用户对该目录是否有读权限
    const readableRoles = await prisma.role.findMany({
      where: { 
        OR: [
          { permission: 'READ_ONLY' },
          { permission: 'READ_WRITE' }
        ]
      },
      select: { id: true },
    });

    const readableRoleIds = readableRoles.map(r => r.id);

    const userDirectoryRole = await prisma.directoryUserRole.findFirst({
      where: {
        userId,
        directoryId,
        roleId: { in: readableRoleIds },
      },
    });

    if (!userDirectoryRole) {
      return NextResponse.json({ error: '无权访问该目录' }, { status: 403 });
    }

    // 查询目录下的文档
    const documents = await prisma.document.findMany({
      where: { directoryId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error('查询目录文档错误:', error);
    return NextResponse.json({ error: '查询目录文档失败' }, { status: 500 });
  }
}
