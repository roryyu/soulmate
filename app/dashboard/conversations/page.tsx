'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// 类型定义
type AIConversation = {
  id: string
  userId: string | null
  userName: string | null
  module: string
  model: string
  prompt: string
  response: string | null
  tokens: number | null
  duration: number | null
  error: string | null
  metadata: string | null
  createdAt: Date
}

type User = {
  id: string
  name: string | null
  email: string
}

type Stats = {
  totalCount: number
  successCount: number
  errorCount: number
  moduleStats: { module: string; count: number }[]
  totalTokens: number
  avgDuration: number
}

// 筛选条件
type Filters = {
  userName: string
  module: string
  search: string
  startDate: string
  endDate: string
  status: string // success, error, all
}

// API 调用函数
async function fetchConversations(params: {
  filters: Filters
  page: number
  pageSize: number
}) {
  const searchParams = new URLSearchParams()
  if (params.filters.userName) searchParams.set('userName', params.filters.userName)
  if (params.filters.module) searchParams.set('module', params.filters.module)
  if (params.filters.search) searchParams.set('search', params.filters.search)
  if (params.filters.startDate) searchParams.set('startDate', params.filters.startDate)
  if (params.filters.endDate) searchParams.set('endDate', params.filters.endDate)
  if (params.filters.status !== 'all') searchParams.set('status', params.filters.status)
  searchParams.set('page', params.page.toString())
  searchParams.set('pageSize', params.pageSize.toString())

  const res = await fetch(`/api/ai/conversations?${searchParams.toString()}`)
  if (!res.ok) throw new Error('获取对话记录失败')
  return res.json()
}

async function fetchStats(userName: string) {
  const res = await fetch('/api/ai/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName }),
  })
  if (!res.ok) throw new Error('获取统计信息失败')
  return res.json() as Promise<Stats>
}

async function fetchUsers() {
  const res = await fetch('/api/ai/conversations/users')
  if (!res.ok) throw new Error('获取用户列表失败')
  return res.json()
}

export default function AIConversationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // 计算默认日期（近一天）
  const getDefaultDates = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 1)
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  const [filters, setFilters] = useState<Filters>(() => {
    const { startDate, endDate } = getDefaultDates()
    return {
      userName: '',
      module: '',
      search: '',
      startDate,
      endDate,
      status: 'all',
    }
  })

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const [convData, statsData, usersData] = await Promise.all([
        fetchConversations({
          filters,
          page,
          pageSize: 20,
        }),
        fetchStats(filters.userName),
        fetchUsers(),
      ])

      setConversations(convData.conversations)
      setTotalPages(convData.totalPages)
      setTotal(convData.total)
      setStats(statsData)
      setUsers(usersData.users)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session, filters, page])

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // 检查是否是管理员
    if (session?.user?.role !== 'ADMIN') {
      router.push('/research/dashboard')
      return
    }

    loadData()
  }, [status, session, loadData, router])

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const handleReset = () => {
    const { startDate, endDate } = getDefaultDates()
    setFilters({
      userName: '',
      module: '',
      search: '',
      startDate,
      endDate,
      status: 'all',
    })
    setPage(1)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // 计算费用：6 元每百万 token
  const calculateCost = (tokens: number | null) => {
    if (tokens === null) return '-'
    const cost = (tokens / 1000000) * 6
    return `¥${cost.toFixed(4)}`
  }

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      '选题灵感生成': '#3b82f6',
      'CNKI检索式生成': '#10b981',
      'CNKI检索式变宽松': '#14b8a6',
      'CNKI检索式变严格': '#06b6d4',
      '文献分析': '#8b5cf6',
      '文献问答': '#a855f7',
      '综述大纲生成': '#7c3aed',
      '研究价值生成': '#f97316',
      '研究目标生成': '#fb923c',
      '研究内容生成': '#fdba74',
      '创新点生成': '#fbbf24',
      '全文审阅': '#ec4899',
      '学术润色': '#f43f5e',
      '观点扩充': '#e11d48',
      '智能降重': '#be123c',
    }
    return colors[module] || '#6b7280'
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-teal-600 transition-colors">平台首页</Link>
          <span className="mx-2">/</span>
          <Link href="/dashboard" className="hover:text-teal-600 transition-colors">Dashboard</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800 font-medium">AI 对话记录</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">AI 对话记录</h1>
            <p className="mt-1 text-slate-500">共 {total} 条记录，方便定位和调优 Prompt</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="border-slate-200 text-slate-800 hover:bg-slate-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            筛选 {showFilters ? '▲' : '▼'}
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200/40 shadow-sm">
              <div className="text-2xl font-bold text-slate-800">{stats.totalCount}</div>
              <div className="text-sm text-slate-500">总调用</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200/40 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.successCount}</div>
              <div className="text-sm text-slate-500">成功</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200/40 shadow-sm">
              <div className="text-2xl font-bold text-red-500">{stats.errorCount}</div>
              <div className="text-sm text-slate-500">失败</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200/40 shadow-sm">
              <div className="text-2xl font-bold text-slate-800">{(stats.totalTokens / 1000).toFixed(1)}k</div>
              <div className="text-sm text-slate-500">消耗 Token</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200/40 shadow-sm">
              <div className="text-2xl font-bold text-teal-600">¥{((stats.totalTokens / 1000000) * 6).toFixed(2)}</div>
              <div className="text-sm text-slate-500">总费用</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200/40 shadow-sm">
              <div className="text-2xl font-bold text-slate-800">{stats.avgDuration}ms</div>
              <div className="text-sm text-slate-500">平均耗时</div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200/40 shadow-sm mb-6 overflow-hidden"
            >
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  {/* 用户名筛选（下拉框） */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">用户</label>
                    <select
                      value={filters.userName}
                      onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    >
                      <option value="">全部用户</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.name || user.email}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 模块筛选 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">模块</label>
                    <select
                      value={filters.module}
                      onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    >
                      <option value="">全部模块</option>
                      {stats?.moduleStats.map((item) => (
                        <option key={item.module} value={item.module}>{item.module}</option>
                      ))}
                    </select>
                  </div>

                  {/* 状态筛选 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">状态</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    >
                      <option value="all">全部</option>
                      <option value="success">成功</option>
                      <option value="error">失败</option>
                    </select>
                  </div>

                  {/* 开始日期 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">开始日期</label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="h-10 bg-white border-slate-200 rounded-xl focus:ring-teal-600 focus:border-teal-600"
                    />
                  </div>

                  {/* 结束日期 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">结束日期</label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="h-10 bg-white border-slate-200 rounded-xl focus:ring-teal-600 focus:border-teal-600"
                    />
                  </div>

                  {/* 搜索 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">关键词搜索</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="搜索内容..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 h-10 bg-white border-slate-200 rounded-xl focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-slate-200 text-slate-800 hover:bg-slate-50"
                  >
                    重置
                  </Button>
                  <Button
                    onClick={handleSearch}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    应用筛选
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200/40 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20">
              <svg className="mx-auto h-12 w-12 text-[slate-200]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-800">暂无对话记录</h3>
              <p className="mt-2 text-slate-500">开始使用 AI 功能后，对话记录将显示在这里</p>
            </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200/40">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-12">#</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-28">时间</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-24">用户</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-28">模块</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-24">模型</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800">Prompt 摘要</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-20">状态</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-20">耗时</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-24">费用</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-800 w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-50">
                  {conversations.map((conv, idx) => (
                    <>
                      <tr key={conv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-400">{(page - 1) * 20 + idx + 1}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap">{formatDate(conv.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-slate-800">{conv.userName || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: getModuleColor(conv.module) }}
                          >
                            {conv.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{conv.model}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 max-w-md truncate">
                          {conv.prompt.length > 50 ? conv.prompt.substring(0, 50) + '...' : conv.prompt}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {conv.error ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                              失败
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                              成功
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDuration(conv.duration)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-teal-600">
                          {calculateCost(conv.tokens)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                            className="h-8 px-2 text-xs border-slate-200 hover:bg-slate-50"
                          >
                            {expandedId === conv.id ? '收起' : '查看'}
                          </Button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === conv.id && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td colSpan={10} className="px-4 py-4 bg-slate-50">
                              <div className="space-y-4">
                                <div>
                                  <div className="text-sm font-medium text-slate-800 mb-2">Prompt</div>
                                  <div className="bg-white rounded-lg p-3 border border-slate-200 text-sm text-slate-600 whitespace-pre-wrap">
                                    {conv.prompt}
                                  </div>
                                </div>
                                {conv.response && (
                                  <div>
                                    <div className="text-sm font-medium text-slate-800 mb-2">Response</div>
                                    <div className="bg-white rounded-lg p-3 border border-slate-200 text-sm text-slate-600 whitespace-pre-wrap">
                                      {conv.response}
                                    </div>
                                  </div>
                                )}
                                {conv.error && (
                                  <div>
                                    <div className="text-sm font-medium text-red-600 mb-2">Error</div>
                                    <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-sm text-red-600 whitespace-pre-wrap">
                                      {conv.error}
                                    </div>
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <Link 
                                    href={`/dashboard/conversations/tuning/${conv.id}`}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    调优
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 px-4 py-4 border-t border-slate-200/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 border-slate-200 text-slate-800 hover:bg-slate-50"
              >
                上一页
              </Button>
              <span className="text-sm text-slate-500">
                第 {page} 页，共 {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 border-slate-200 text-slate-800 hover:bg-slate-50"
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
