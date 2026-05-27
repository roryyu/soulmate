import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 编辑角色
// PUT /api/role/edit/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { name, permission } = data;
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

    // 更新角色信息
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(name !== undefined && { name }),
        ...(permission !== undefined && { permission }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      role: updatedRole,
    });
  } catch (error) {
    console.error('编辑角色错误:', error);
    return NextResponse.json({ error: '编辑角色失败' }, { status: 500 });
  }
}
