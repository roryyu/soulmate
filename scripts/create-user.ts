#!/usr/bin/env tsx
/**
 * 创建用户脚本
 * 用法: npm run create-user -- <邮箱1> [邮箱2] [邮箱3] ...
 * 示例: npm run create-user -- user1@example.com user2@example.com
 */

import { prisma } from '../lib/prisma'
import { getNewUserGiftCredits, buildNewUserCreditNestedCreate } from '../lib/system-settings'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

// 生成随机密码
function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }
  return password
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 创建单个用户
async function createSingleUser(email: string) {
  try {
    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return {
        success: false,
        email,
        error: '邮箱格式无效'
      }
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return {
        success: false,
        email,
        error: '用户已存在'
      }
    }

    // 生成随机密码
    const rawPassword = generateRandomPassword()

    // 加密密码
    const hashedPassword = await bcrypt.hash(rawPassword, 10)

    // 中文注释：与线上一致，按系统配置赠送积分
    const giftCredits = await getNewUserGiftCredits()
    const creditNested = buildNewUserCreditNestedCreate(giftCredits)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: email.split('@')[0], // 默认使用邮箱前缀作为用户名
        role: 'TEACHER', // 默认角色为教师
        ...creditNested,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    return {
      success: true,
      user: {
        ...user,
        rawPassword // 明文密码，仅用于显示给用户
      }
    }
  } catch (error) {
    return {
      success: false,
      email,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// 主函数
async function main() {
  // 获取命令行参数中的邮箱列表
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('\n❌ 错误: 请提供至少一个邮箱地址')
    console.log('\n📖 用法: npm run create-user -- <邮箱1> [邮箱2] [邮箱3] ...')
    console.log('示例: npm run create-user -- user1@example.com user2@example.com\n')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))
  console.log('🚀 开始创建用户...')
  console.log('='.repeat(70))

  const results = []
  
  // 批量创建用户
  for (const email of args) {
    const result = await createSingleUser(email.trim())
    results.push(result)
    
    if (result.success) {
      console.log(`\n✅ 成功创建用户: ${email}`)
    } else {
      console.log(`\n❌ 创建失败: ${email} - ${result.error}`)
    }
  }

  // 输出汇总结果
  console.log('\n' + '='.repeat(70))
  console.log('📋 创建结果汇总')
  console.log('='.repeat(70))

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  console.log(`\n总计: ${args.length} 个邮箱`)
  console.log(`成功: ${successCount} 个`)
  console.log(`失败: ${failCount} 个`)

  // 详细列出成功创建的用户信息
  const successfulResults = results.filter(r => r.success)
  if (successfulResults.length > 0) {
    console.log('\n' + '='.repeat(70))
    console.log('🔑 账户信息 (请妥善保管)')
    console.log('='.repeat(70))
    
    successfulResults.forEach((result, index) => {
      if (result.user) {
        console.log(`\n[用户 ${index + 1}]`)
        console.log(`  用户ID: ${result.user.id}`)
        console.log(`  邮箱: ${result.user.email}`)
        console.log(`  用户名: ${result.user.name}`)
        console.log(`  角色: ${result.user.role}`)
        console.log(`  初始密码: ${result.user.rawPassword}`)
      }
    })

    // 输出修改密码提示
    console.log('\n' + '='.repeat(70))
    console.log('⚠️  重要提示')
    console.log('='.repeat(70))
    console.log('\n  1. 以上密码为系统自动生成的初始密码，请妥善保管')
    console.log('  2. 首次登录后，请立即修改密码')
    console.log('  3. 修改密码路径: 登录后 -> 设置 -> 修改密码')
    console.log('  4. 如忘记密码，请联系管理员重置')
  }

  console.log('\n' + '='.repeat(70))
  console.log('✨ 操作完成!')
  console.log('='.repeat(70) + '\n')

  await prisma.$disconnect()
  process.exit(0)
}

// 错误处理
main().catch(async (error) => {
  console.error('\n❌ 脚本执行错误:', error)
  await prisma.$disconnect()
  process.exit(1)
})
