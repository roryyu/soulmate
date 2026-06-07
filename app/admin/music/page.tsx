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
  Disc,
} from 'lucide-react'

// 类型定义
type MusicCover = {
  id: string
  name: string | null
  base64data: string | null
  audioDuration: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}

type MusicCoverResource = {
  id: string
  musicCoverId: string
  researchProjectId: string
  musicCover: MusicCover
}

type ResearchProject = {
  id: string
  userId: string
  title: string
  field: string
  description: string | null
  status: string
  prompt: string | null
  sampleRate: number
  bitrate: number
  format: string
  musicCovers: MusicCoverResource[]
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
async function fetchMusicProjects(page = 1, pageSize = 20): Promise<{
  data: ResearchProject[]
  pagination: PaginationInfo
}> {
  const res = await fetch(`/api/admin/music?page=${page}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('获取音乐项目列表失败')
  return res.json()
}

async function deleteMusicProject(id: string): Promise<void> {
  const res = await fetch(`/api/admin/music/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除音乐项目失败')
}

// 粒子背景组件
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400/20 rounded-full"
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

// 获取状态颜色和图标
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return { color: 'bg-slate-100 text-slate-700', label: '草稿', icon: Clock }
    case 'ANALYZING':
      return { color: 'bg-blue-100 text-blue-700', label: '分析中', icon: Loader2 }
    case 'COMPLETED':
      return { color: 'bg-green-100 text-green-700', label: '已完成', icon: CheckCircle2 }
    case 'FAILED':
      return { color: 'bg-red-100 text-red-700', label: '失败', icon: AlertCircle }
    default:
      return { color: 'bg-slate-100 text-slate-700', label: status, icon: Clock }
  }
}

export default function MusicProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ResearchProject[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // 加载音乐项目列表
  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchMusicProjects(currentPage, 20)
      setProjects(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to load music projects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // 如果有处理中的任务，每3秒刷新一次
  useEffect(() => {
    const hasProcessing = projects.some(project => project.status === 'ANALYZING')
    if (!hasProcessing) return

    const interval = setInterval(loadProjects, 3000)
    return () => clearInterval(interval)
  }, [projects, loadProjects])

  // 过滤结果
  const filteredProjects = projects.filter(project =>
    !searchTerm ||
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.field.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个音乐项目吗？')) return
    try {
      await deleteMusicProject(id)
      await loadProjects()
    } catch (error) {
      console.error('Failed to delete music project:', error)
      alert('删除失败，请稍后重试')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-cyan-50/50 via-white to-white"
    >
      {/* 粒子背景 */}
      <ParticleBackground />

      {/* 背景光晕装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmates" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmates</h1>
                <p className="text-xs text-slate-500">音乐生成管理</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">

              <Button
                onClick={() => router.push('/admin/music/new')}
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加音乐生成
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-md">
              <Disc className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">音乐生成管理</h1>
              <p className="text-sm text-slate-500">创建和管理您的音乐制作项目</p>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="搜索项目名称或领域..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* 音乐项目列表 */}
        {filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-100 to-teal-100 rounded-3xl flex items-center justify-center mb-6">
              <Disc className="w-12 h-12 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">开始您的音乐项目</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              创建音乐项目，添加母带，开始您的音乐制作之旅
            </p>
            <Button
              onClick={() => router.push('/admin/music/new')}
              size="lg"
              className="rounded-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white px-8 shadow-lg shadow-cyan-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              创建第一个项目
            </Button>
          </motion.div>
        ) : (
          /* 项目卡片网格 */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {filteredProjects.map((project, index) => {
              const statusConfig = getStatusConfig(project.status)
              const StatusIcon = statusConfig.icon
              
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-slate-100">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all">
                            <Disc className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
                              {project.title}
                            </CardTitle>
                            <p className="text-xs text-slate-500">
                              {project.field} · {formatDate(project.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3 mb-4">
                        {project.description && (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{project.description}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>采样: {project.sampleRate / 1000}kHz</span>
                          <span>比特: {project.bitrate / 1000}kbps</span>
                          <span>格式: {project.format}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50"
                          onClick={() => router.push(`/admin/music/${project.id}`)}
                        >
                          查看详情
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(project.id)}
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
