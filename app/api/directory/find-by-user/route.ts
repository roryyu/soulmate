import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询当前用户有权限的目录列表（树状视图）
// GET /api/directory/find-by-user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // 获取当前用户的tenantId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ error: '当前用户没有所属租户' }, { status: 400 });
    }

    const tenantId = user.tenantId;

    // 查询用户有权限的目录用户角色（需要有 READ-WRITE 权限的角色）
    // 先查询有 permission = 'READ-WRITE' 的角色
    const writableRoles = await prisma.role.findMany({
      where: { permission: 'READ_WRITE' },
      select: { id: true },
    });

    const writableRoleIds = writableRoles.map(r => r.id);

    // 查询用户在这些角色下的目录
    const userDirectoryRoles = await prisma.directoryUserRole.findMany({
      where: {
        userId,
        roleId: { in: writableRoleIds },
      },
      select: { directoryId: true },
    });

    const writableDirectoryIds = new Set(userDirectoryRoles.map(d => d.directoryId));

    // 查询租户下的所有目录
    const allDirectories = await prisma.directory.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // 为每个目录标记是否有读写权限
    const directoriesWithPermission = allDirectories.map(dir => ({
      ...dir,
      hasWritePermission: writableDirectoryIds.has(dir.id),
    }));

    // 统计每个目录下的文档数量
    const directoriesWithDocCount = await Promise.all(
      directoriesWithPermission.map(async (dir) => {
        const docCount = await prisma.document.count({
          where: { directoryId: dir.id },
        });
        return {
          ...dir,
          docCount,
        };
      })
    );

    // 定义目录类型
    interface DirectoryNode {
      id: string;
      name: string | null;
      parentId: string | null;
      description: string | null;
      tenantId: string | null;
      createdAt: Date;
      updatedAt: Date;
      docCount: number;
      hasWritePermission: boolean;
      children?: DirectoryNode[];
    }

    // 构建目录树
    const buildTree = (directories: DirectoryNode[], parentId: string | null = null): DirectoryNode[] => {
      return directories
        .filter((dir) => dir.parentId === parentId)
        .map((dir) => ({
          ...dir,
          children: buildTree(directories, dir.id),
        }));
    };

    const directoryTree = buildTree(directoriesWithDocCount);

    return NextResponse.json({
      success: true,
      directories: directoryTree,
      total: directoryTree.length,
      treeView: true,
    });
  } catch (error) {
    console.error('查询目录错误:', error);
    return NextResponse.json({ error: '查询目录失败' }, { status: 500 });
  }
}
