import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 创建 PrismaClient 实例，禁用预编译语句缓存以解决无服务器环境问题
function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL || ''

  // 云函数上同一实例可能并发处理多个请求，connection_limit=1 极易 P2024；可通过环境变量调大（注意总连接数 ≈ 实例数 × 本值）
  const rawLimit = process.env.PRISMA_CONNECTION_LIMIT ?? '3'
  const connectionLimit = Math.min(50, Math.max(1, parseInt(rawLimit, 10) || 3))
  const rawPoolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '20'
  const poolTimeout = Math.min(120, Math.max(1, parseInt(rawPoolTimeout, 10) || 20))

  // 解析现有 URL 并添加禁用预编译语句缓存的参数
  let url = baseUrl
  if (baseUrl) {
    try {
      const urlObj = new URL(baseUrl)
      // 禁用预编译语句缓存
      urlObj.searchParams.set('preparedStatementCacheSize', '0')
      // 进程内连接池大小（每实例）；过大会挤爆数据库 max_connections
      urlObj.searchParams.set('connection_limit', String(connectionLimit))
      // 从池取连接的最大等待（秒），过短易误判为 P2024
      urlObj.searchParams.set('pool_timeout', String(poolTimeout))
      // 设置连接超时
      urlObj.searchParams.set('connect_timeout', '10')
      url = urlObj.toString()
    } catch {
      // 如果 URL 解析失败，使用简单的字符串追加方式
      const separator = baseUrl.includes('?') ? '&' : '?'
      url = `${baseUrl}${separator}preparedStatementCacheSize=0&connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// 在所有环境下都将 Prisma 实例保存到全局变量，确保单例模式
globalForPrisma.prisma = prisma