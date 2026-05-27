import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 查询目录列表
// POST /api/directory/find
export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { id, name, parentId, treeView = false } = data;
    const userId = (auth.session as { user: { id: string } }).user.id;

    // 获取当前用户的tenantId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ error: '当前用户没有所属租户' }, { status: 400 });
    }

    const tenantId = user.tenantId;

    // 构建查询条件
    const where = {
      tenantId,
      ...(id && { id }),
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(parentId !== undefined && { parentId }),
    };

    if (treeView) {
      // 查询所有目录并构建树结构
      const allDirectories = await prisma.directory.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      // 统计每个目录下的文档数量
      const directoriesWithDocCount = await Promise.all(
        allDirectories.map(async (dir) => {
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
    } else {
      // 普通列表查询
      const directories = await prisma.directory.findMany({
        where,
        include: {
          parent: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 统计每个目录下的文档数量
      const directoriesWithDocCount = await Promise.all(
        directories.map(async (dir) => {
          const docCount = await prisma.document.count({
            where: { directoryId: dir.id },
          });
          return {
            ...dir,
            parentName: dir.parent?.name || null,
            docCount,
          };
        })
      );

      return NextResponse.json({
        success: true,
        directories: directoriesWithDocCount,
        total: directoriesWithDocCount.length,
        treeView: false,
      });
    }
  } catch (error) {
    console.error('查询目录错误:', error);
    return NextResponse.json({ error: '查询目录失败' }, { status: 500 });
  }
}
