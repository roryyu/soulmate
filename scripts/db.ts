#!/usr/bin/env tsx
/**
 * 数据库连接测试脚本
 * 用法: npx tsx scripts/db.ts
 */

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['error'],
  })

  try {
    console.log('🔄 正在测试数据库连接...')
    console.log(`📡 数据库地址: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') || '未配置'}`)

    // 测试连接：执行简单查询
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ 数据库连接成功！')
    console.log('📊 测试查询结果:', result)

    // 获取数据库信息
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`
    console.log('📋 数据库信息:', dbInfo)

    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:')
    console.error(error)
    return false
  } finally {
    await prisma.$disconnect()
    console.log('🔌 数据库连接已断开')
  }
}

// 执行测试
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('💥 脚本执行异常:', error)
    process.exit(1)
  })