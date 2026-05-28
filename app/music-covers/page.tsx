'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Music,
  Plus,
  Edit,
  Trash2,
  Search,
  ArrowRight,
  Clock,
  FileText,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

// 类型定义
type MusicCover = {
  id: string
  name: string | null
  coverFeatureId: string | null
  structureResult: string | null
  base64data: string | null
  audioDuration: number | null
  audioFilePath: string | null
  audioFileUrl: string | null
  status: string
  error: string | null
  createdAt: Date
  updatedAt: Date
}

type PaginationInfo = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// API 调用函数
async function fetchMusicCovers(page = 1, pageSize = 20): Promise<{
  data: MusicCover[]
  pagination: PaginationInfo
}> {
  const res = await fetch(`/api/music-covers?page=${page}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('获取音乐母带列表失败')
  return res.json()
}

async function deleteMusicCover(id: string): Promise<void> {
  const res = await fetch(`/api/music-covers/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除音乐母带失败')
}

// 粒子背景组件
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-violet-400/20 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          animate={{
            y: [null, -20, 20],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )
}

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 格式化时长
const formatDuration = (seconds: number | null) => {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 获取状态颜色和图标
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { color: 'bg-slate-100 text-slate-700', label: '待处理', icon: Clock }
    case 'processing':
      return { color: 'bg-blue-100 text-blue-700', label: '处理中', icon: Loader2 }
    case 'completed':
      return { color: 'bg-green-100 text-green-700', label: '已完成', icon: CheckCircle2 }
    case 'failed':
      return { color: 'bg-red-100 text-red-700', label: '失败', icon: AlertCircle }
    default:
      return { color: 'bg-slate-100 text-slate-700', label: status, icon: Clock }
  }
}

export default function MusicCoversPage() {
  const router = useRouter()
  const [musicCovers, setMusicCovers] = useState<MusicCover[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // 加载音乐母带列表
  const loadMusicCovers = useCallback(async () => {
    try {
      const data = await fetchMusicCovers(currentPage, 20)
      setMusicCovers(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to load music covers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  // Fetch on mount and page change
  useEffect(() => {
    loadMusicCovers()
  }, [loadMusicCovers])

  // 如果有处理中的任务，每3秒刷新一次
  useEffect(() => {
    const hasProcessing = musicCovers.some(cover => cover.status === 'processing')
    if (!hasProcessing) return

    const interval = setInterval(loadMusicCovers, 3000)
    return () => clearInterval(interval)
  }, [musicCovers, loadMusicCovers])

  // 过滤结果
  const filteredCovers = musicCovers.filter(cover =>
    !searchTerm ||
    cover.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条音乐母带记录吗？')) return
    try {
      await deleteMusicCover(id)
      await loadMusicCovers()
    } catch (error) {
      console.error('Failed to delete music cover:', error)
      alert('删除失败，请稍后重试')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-white"
    >
      {/* 粒子背景 */}
      <ParticleBackground />

      {/* 背景光晕装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">音乐母带管理</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/music">
                <Button variant="ghost" size="sm" className="text-slate-600">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  返回控制台
                </Button>
              </Link>
              <Button
                onClick={() => router.push('/music-covers/new')}
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                上传音乐
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">音乐母带管理</h1>
              <p className="text-sm text-slate-500">上传、预处理和管理您的音乐母带文件</p>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="搜索音乐名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-violet-500 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* 音乐母带列表 */}
        {filteredCovers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
              <Music className="w-12 h-12 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">开始您的音乐之旅</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              上传音乐文件，我们将为您提供专业的母带预处理服务
            </p>
            <Button
              onClick={() => router.push('/music-covers/new')}
              size="lg"
              className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-8 shadow-lg shadow-violet-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              上传第一首音乐
            </Button>
          </motion.div>
        ) : (
          /* 音乐卡片网格 */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {filteredCovers.map((cover, index) => {
              const statusConfig = getStatusConfig(cover.status)
              const StatusIcon = statusConfig.icon
              
              return (
                <motion.div
                  key={cover.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-slate-100">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">
                              {cover.name || '未命名音乐'}
                            </CardTitle>
                            <p className="text-xs text-slate-500">
                              {formatDate(cover.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                          {cover.status === 'processing' ? (
                            <StatusIcon className="w-3 h-3 animate-spin" />
                          ) : (
                            <StatusIcon className="w-3 h-3" />
                          )}
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3 mb-4">
                        {cover.audioDuration && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span>时长: {formatDuration(cover.audioDuration)}</span>
                          </div>
                        )}
                        {cover.coverFeatureId && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4" />
                            <span>特征ID: {cover.coverFeatureId.slice(0, 12)}...</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-slate-600 hover:text-violet-600 hover:bg-violet-50"
                          onClick={() => router.push(`/music-covers/${cover.id}`)}
                        >
                          查看详情
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => router.push(`/music-covers/${cover.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(cover.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* 分页 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className="text-sm text-slate-600">
              第 {currentPage} / {pagination.totalPages} 页
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              下一页
            </Button>
          </div>
        )}
      </main>

      {/* 底部装饰 */}
      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}
