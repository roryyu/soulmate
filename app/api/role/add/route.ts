import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 添加角色
// POST /api/role/add
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const { name, permission } = data;

    // 验证必填字段
    if (!name) {
      return NextResponse.json({ error: '角色名称不能为空' }, { status: 400 });
    }

    // 创建角色
    const role = await prisma.role.create({
      data: {
        name,
        permission,
      },
    });

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    console.error('添加角色错误:', error);
    return NextResponse.json({ error: '添加角色失败' }, { status: 500 });
  }
}
