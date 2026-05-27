import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 新增租户
// POST /api/tenant/add
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    const {
      name,
      productId,
      userName,
      userEmail,
      userPhone,
      userPassword,
    } = data;

    // 校验必填字段
    if (!name || !productId || !userName || !userEmail || !userPhone || !userPassword) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    // 检查手机号是否已存在
    const existingPhone = await prisma.user.findUnique({
      where: { phone: userPhone },
    });
    if (existingPhone) {
      return NextResponse.json({ error: '该手机号已被注册' }, { status: 400 });
    }

    // 检查产品是否存在
    const product = await prisma.tenantProduct.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // ???: 租户管理员是否要赠送积分

    // 创建租户和用户（使用事务确保原子性）
    const tenantData = await prisma.$transaction(async (tx) => {
      // 创建租户
      const tenant = await tx.tenant.create({
        data: {
          name,
          productId,
        },
      });

      // 创建租户管理员用户
      const user = await tx.user.create({
        data: {
          name: userName,
          email: userEmail,
          phone: userPhone,
          password: hashedPassword, // 使用加密后的密码
          role: 'TENANTADMIN', // 租户管理员默认角色为 TENANTADMIN
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return NextResponse.json({
      success: true,
      tenant: tenantData.tenant,
      user: tenantData.user,
    });
  } catch (error) {
    console.error('新增租户错误:', error);
    return NextResponse.json({ error: '新增租户失败' }, { status: 500 });
  }
}