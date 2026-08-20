import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 删除租户
// DELETE /api/tenant/delete/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const tenantId = params.id;

    // 验证必填字段
    if (!tenantId) {
      return NextResponse.json({ error: '租户ID不能为空' }, { status: 400 });
    }

    // 检查租户是否存在
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: '租户不存在' }, { status: 404 });
    }

    // 在事务中执行删除操作
    await prisma.$transaction(async (tx) => {
      // 先删除租户的租户管理员
      await tx.user.deleteMany({
        where: { 
          tenantId,
          role: 'TENANTADMIN'
        },
      });

      // 检查租户下是否还有其他用户
      const remainingUserCount = await tx.user.count({
        where: { tenantId },
      });

      if (remainingUserCount > 0) {
        throw new Error('该租户下还有其他用户，无法删除');
      }

      // 最后删除租户
      await tx.tenant.delete({
        where: { id: tenantId },
      });
    });

    return NextResponse.json({
      success: true,
      message: '租户已成功删除',
    });
  } catch (error: any) {
    console.error('删除租户错误:', error);
    if (error.message === '该租户下还有其他用户，无法删除') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: '删除租户失败' }, { status: 500 });
  }
}
