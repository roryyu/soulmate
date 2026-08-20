'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Users, UserPlus, Search, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  tenantId: string | null
  tenant?: {
    id: string
    name: string | null
  } | null
  creditsBalance?: number
}

export default function TenantAdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 表单状态
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 用户列表状态
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  const [userLimit, setUserLimit] = useState<number | null>(null)
  const [currentUserCount, setCurrentUserCount] = useState(0)

  // 消息提示
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>({
    type: 'success',
    text: '',
  })

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/tenant-admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setUserLimit(data.userLimit)
        setCurrentUserCount(data.currentUserCount)
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  // 检查权限和加载数据
  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // 检查是否是租户管理员
    if (session?.user?.role !== 'TENANTADMIN') {
      router.push('/admin/prescription')
      return
    }

    fetchUsers()
  }, [status, session, router])

  // 处理创建用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: 'success', text: '' })

    // 表单验证
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少为6个字符' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tenant-admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `用户创建成功！` })
        // 清空表单
        setName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        // 刷新用户列表
        fetchUsers()
      } else {
        setMessage({ type: 'error', text: data.error || '创建用户失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  // 过滤用户列表
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-300/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link
            href="/auth/tenant-admin/dashboard"
            className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
           返回租户管理
          </Link>
        </motion.div>

        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">租户用户管理</h1>
          </div>
          <p className="text-slate-500">管理您的租户用户账户</p>
        </motion.div>

        {/* 消息提示 */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 flex items-center gap-2 p-4 rounded-xl text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Tab切换 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-1.5 inline-flex shadow-sm border border-slate-100">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-sky-100'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              创建用户
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'list'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-sky-100'
              }`}
            >
              <Users className="w-4 h-4" />
              用户列表 ({currentUserCount}/{userLimit !== null ? userLimit : '无限制'})
            </button>
          </div>
        </motion.div>

        {/* 创建用户表单 */}
        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">创建新用户</h2>
                  <p className="text-sm text-slate-500">为新用户创建平台账户</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-5 max-w-md">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sky-800 font-medium">
                      用户姓名
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      required
                      placeholder="请输入用户姓名"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sky-800 font-medium">
                      邮箱地址
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      required
                      placeholder="请输入邮箱地址"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sky-800 font-medium">
                      初始密码
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      required
                      placeholder="请输入初始密码"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-sky-800 font-medium">
                      确认密码
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="请再次输入密码"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      创建中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      创建用户
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* 用户列表 */}
        {activeTab === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6">
              {/* 搜索框 */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="搜索用户姓名或邮箱..."
                    value={searchTerm}
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">用户</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">邮箱</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">角色</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">积分</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">创建时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-500">
                            {searchTerm ? '未找到匹配的用户' : '暂无用户数据'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user, index) => (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                  {(user.name || user.email)[0].toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-800">{user.name || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'ADMIN'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}>
                                {user.role === 'ADMIN' ? '管理员' : user.role === 'TENANTADMIN' ? '租户管理员' : '教师'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                              {user.creditsBalance ?? 0}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
                              {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
