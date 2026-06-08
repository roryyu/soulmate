'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Music,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Disc,
} from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

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

async function fetchMusicProjects(page = 1, pageSize = 20): Promise<{
  data: ResearchProject[]
  pagination: PaginationInfo
}> {
  const res = await fetch(`/api/admin/music?page=${page}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('获取音乐项目列表失败')
  return res.json()
}

async function deleteMusicProject(id: string): Promise<void> {
  const res = await fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除音乐项目失败')
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'DRAFT': return { color: 'bg-[#f7f7f7] text-[#6a6a6a]', label: '草稿', icon: Clock }
    case 'ANALYZING': return { color: 'bg-blue-50 text-blue-600', label: '分析中', icon: Loader2 }
    case 'COMPLETED': return { color: 'bg-emerald-50 text-emerald-600', label: '已完成', icon: CheckCircle2 }
    case 'FAILED': return { color: 'bg-red-50 text-red-600', label: '失败', icon: AlertCircle }
    default: return { color: 'bg-[#f7f7f7] text-[#6a6a6a]', label: status, icon: Clock }
  }
}

export default function MusicProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ResearchProject[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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

  useEffect(() => { loadProjects() }, [loadProjects])

  useEffect(() => {
    const hasProcessing = projects.some(p => p.status === 'ANALYZING')
    if (!hasProcessing) return
    const interval = setInterval(loadProjects, 3000)
    return () => clearInterval(interval)
  }, [projects, loadProjects])

  const filteredProjects = projects.filter(p =>
    !searchTerm ||
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.field.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dddddd] border-t-[#222222]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader
        subtitle="音乐生成管理"
        action={{ label: '添加音乐生成', onClick: () => router.push('/admin/music/new') }}
      />

      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">音乐生成管理</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1">创建和管理您的音乐制作项目</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929292]" />
            <Input
              type="text"
              placeholder="搜索项目名称或领域..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-[#dddddd] rounded-lg text-[14px] focus:border-[#222222] focus:ring-[#222222]"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-24 border border-[#ebebeb] rounded-[14px]">
            <Disc className="w-12 h-12 text-[#dddddd] mx-auto mb-4" />
            <h3 className="text-[16px] font-semibold text-[#222222] mb-2">开始您的音乐项目</h3>
            <p className="text-[14px] text-[#6a6a6a] mb-8">创建音乐项目，添加母带，开始您的音乐制作之旅</p>
            <button
              onClick={() => router.push('/admin/music/new')}
              className="h-12 px-8 rounded-lg bg-[#ff385c] text-white text-[16px] font-medium hover:bg-[#e00b41] transition-colors"
            >
              创建第一个项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredProjects.map((project) => {
              const statusConfig = getStatusConfig(project.status)
              const StatusIcon = statusConfig.icon
              return (
                <div
                  key={project.id}
                  className="p-5 rounded-[14px] border border-[#dddddd] bg-gradient-to-br from-white via-rose-50/30 to-orange-50/40 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] transition-shadow cursor-pointer"
                  onClick={() => router.push(`/admin/music/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-semibold text-[#222222] truncate">{project.title}</h3>
                      <p className="text-[13px] text-[#6a6a6a]">{project.field} · {formatDate(project.createdAt)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-[14px] text-[#6a6a6a] line-clamp-2 mb-3">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[12px] text-[#929292] mb-4">
                    <span>{project.sampleRate / 1000}kHz</span>
                    <span>{project.bitrate / 1000}kbps</span>
                    <span>{project.format}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/admin/music/${project.id}`) }}
                      className="flex-1 h-9 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }}
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-[#6a6a6a] hover:text-[#c13515] hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-9 px-4 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-[14px] text-[#6a6a6a]">第 {currentPage} / {pagination.totalPages} 页</span>
            <button
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              className="h-9 px-4 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
