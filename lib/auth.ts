import type { Session } from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { userHasLoginPasswordSet } from '@/lib/user-login-password'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // 邮箱密码登录
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        // 未设置过密码的用户不能走邮箱密码登录（如纯手机号注册）
        if (!userHasLoginPasswordSet(user.password)) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
        }
      }
    }),
    // 手机号验证码登录
    CredentialsProvider({
      id: 'phone-verification-code',
      name: 'phone-verification-code',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        code: { label: 'Code', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          return null
        }

        // 查找有效的验证码（允许已使用的验证码，用于注册后的自动登录）
        const smsCode = await prisma.smsCode.findFirst({
          where: {
            phone: credentials.phone,
            code: credentials.code,
            expires: {
              gt: new Date()
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        if (!smsCode) {
          return null
        }

        // 如果是未使用的验证码，标记为已使用
        if (!smsCode.used) {
          await prisma.smsCode.update({
            where: { id: smsCode.id },
            data: { used: true }
          })
        }

        // 查找用户
        const user = await prisma.user.findUnique({
          where: {
            phone: credentials.phone
          }
        })

        if (!user) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
        }
      }
    }),
    // 管理员模拟用户登录
    CredentialsProvider({
      id: 'admin-impersonate',
      name: 'admin-impersonate',
      credentials: {
        userId: { label: 'User ID', type: 'text' }
      },
      async authorize(credentials, req) {
        // 这里的验证逻辑在API路由中已经处理
        // 我们只需要返回用户信息
        if (!credentials?.userId) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId }
        })

        if (!user) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          isImpersonating: true,
          // 注意：这里我们不能直接获取模拟者信息，需要在JWT回调中处理
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    // 登录成功后的默认落地页：数字疗愈仪表盘（退出登录时跳转到首页）
    async redirect({ url, baseUrl }) {
      const dashboard = `${baseUrl}/music`
      // 退出登录时跳转到首页
      if (url.includes('logout=true')) {
        return baseUrl
      }
      if (url.startsWith('/')) {
        if (url === '/' || url === '') return dashboard
        return `${baseUrl}${url}`
      }
      try {
        const u = new URL(url)
        // 退出登录时跳转到首页
        if (u.searchParams.get('logout') === 'true') {
          return baseUrl
        }
        if (u.origin === baseUrl && (u.pathname === '/' || u.pathname === '')) {
          return dashboard
        }
        if (u.origin === baseUrl) return url
      } catch {
        /* 非法 url 走默认 */
      }
      return dashboard
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.phone = user.phone

        // 检查是否是模拟登录
        if (account?.provider === 'admin-impersonate') {
          token.isImpersonating = true
          // 注意：模拟者信息需要在前端通过其他方式传递，
          // 或者我们可以在API路由中设置一个临时的cookie来传递
        }
      }

      // 前端调用 update() 后从数据库刷新资料（邮箱修改等）
      if (trigger === 'update' && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { email: true, name: true, phone: true, role: true },
        })
        if (fresh) {
          token.email = fresh.email
          token.name = fresh.name
          token.phone = fresh.phone
          token.role = fresh.role
        }
      }

      return token
    },
    // 显式标注返回值，避免 getServerSession 将 R 推断为 {}（见 next-auth 对 session 回调返回类型的泛型推断）
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.id = token.id as string
        if (typeof token.email === 'string' && token.email.length > 0) {
          session.user.email = token.email
        }
        if (token.name !== undefined) {
          session.user.name = token.name as string | null
        }
        session.user.role = token.role as string
        session.user.phone = token.phone as string | null

        // 如果是模拟登录，添加标志
        if (token.isImpersonating) {
          // 注意：这里我们需要从cookie或其他地方获取模拟者信息
          // 暂时只标记为模拟登录
          session.user.isImpersonating = true
        }
      }
      return session
    }
  }
}
