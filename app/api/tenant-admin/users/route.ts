import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getNewUserGiftCredits, buildNewUserCreditNestedCreate } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

// 查询租户下的用户列表
// GET /api/tenant-admin/users
export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const userId = (auth.session as { user: { id: string } }).user.id;

    // 获取当前用户的tenantId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: '当前用户没有所属租户' }, { status: 400 });
    }

    const tenantId = currentUser.tenantId;

    // 获取租户信息和产品配置
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { product: true }
    });

    // 查询租户下的用户列表（包含积分信息）
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        createdAt: true,
        tenantId: true,
        tenant: { select: { id: true, name: true } },
        credit: { select: { balance: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算不包含租户管理员的用户数
    const nonAdminUsers = users.filter(u => u.role !== 'TENANTADMIN');

    // 格式化用户数据
    const normalizedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      tenantId: u.tenantId,
      tenant: u.tenant,
      creditsBalance: u.credit?.balance ?? 0
    }));

    return NextResponse.json({
      success: true,
      users: normalizedUsers,
      total: normalizedUsers.length,
      userLimit: tenant?.product?.userLimit,
      currentUserCount: nonAdminUsers.length
    });
  } catch (error) {
    console.error('查询租户用户错误:', error);
    return NextResponse.json({ error: '查询租户用户失败' }, { status: 500 });
  }
}

// 租户管理员创建用户
// POST /api/tenant-admin/users
export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin();
  if (auth.error) return auth.error;

  try {
    const userId = (auth.session as { user: { id: string } }).user.id;
    const data = await request.json();
    const { name, email, password } = data;

    // 验证必填字段
    if (!name || !email || !password) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取当前用户的tenantId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: '当前用户没有所属租户' }, { status: 400 });
    }

    const tenantId = currentUser.tenantId;

    // 获取租户信息和产品配置
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { product: true }
    });

    // 检查用户数量限制
    if (tenant?.product?.userLimit) {
      const currentUsers = await prisma.user.count({
        where: { tenantId, role: { not: 'TENANTADMIN' } }
      });
      if (currentUsers >= tenant.product.userLimit) {
        return NextResponse.json({ error: '已达到用户数量上限' }, { status: 400 });
      }
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: '用户已存在' }, { status: 400 });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 获取新用户赠送积分
    const giftCredits = await getNewUserGiftCredits();
    const creditNested = buildNewUserCreditNestedCreate(giftCredits);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        tenantId,
        ...creditNested,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('创建租户用户错误:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
