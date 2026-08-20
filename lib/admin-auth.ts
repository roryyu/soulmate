import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/** 校验当前请求是否为管理员，返回 session 或错误响应 */
export async function requireAdmin(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: '未登录' }, { status: 401 }),
    };
  }
  if (session.user.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: '无管理员权限' }, { status: 403 }),
    };
  }
  // NextAuthOptions 会弱化 getServerSession 的泛型推断，此处已校验 user，收窄为 Session
  return { session: session as Session, error: null };
}

export async function requireTenantAdmin(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: '未登录' }, { status: 401 }),
    };
  }
  if (session.user.role !== 'TENANTADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: '无租户管理员权限' }, { status: 403 }),
    };
  }
  return { session: session as Session, error: null };
}
