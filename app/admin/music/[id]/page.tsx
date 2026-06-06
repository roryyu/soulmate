'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Disc,
  Edit,
  Trash2,
  ArrowLeft,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music,
  Plus,
  Play,
  Pause,
  Download,
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

type TocData = {
  id: string
  name: string | null
  key: string | null
  etag: string | null
  createdAt: Date
  updatedAt: Date
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
  tocDataId: string | null
  musicCovers: MusicCoverResource[]
  tocData: TocData | null
  createdAt: Date
  updatedAt: Date
}

// API 调用函数
async function fetchMusicProject(id: string): Promise<ResearchProject> {
  const res = await fetch(`/api/admin/music/${id}`)
  if (!res.ok) throw new Error('获取音乐项目详情失败')
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
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export default function MusicProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [project, setProject] = useState<ResearchProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 加载音乐项目详情
  const loadProject = async () => {
    try {
      const data = await fetchMusicProject(params.id)
      setProject(data)
    } catch (error) {
      console.error('Failed to load music project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
  }, [params.id])

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // 播放/暂停音频
  const handlePlay = () => {
    if (!project?.tocDataId) return

    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/admin/toc-data/${project.tocDataId}/stream`)
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
      audioRef.current.addEventListener('error', () => {
        alert('音频播放失败')
        setIsPlaying(false)
      })
    }

    audioRef.current.play()
    setIsPlaying(true)
  }

  // 下载音频
  const handleDownload = async () => {
    if (!project?.tocDataId) return
    
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/admin/toc-data/${project.tocDataId}/download`)
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '下载失败')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.title}.mp3`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      alert('下载失败，请重试')
    } finally {
      setIsDownloading(false)
    }
  }

  // 如果状态是分析中，轮询更新
  useEffect(() => {
    if (project?.status === 'ANALYZING') {
      const interval = setInterval(loadProject, 3000)
      return () => clearInterval(interval)
    }
  }, [project?.status, params.id])

  // 处理删除
  const handleDelete = async () => {
    if (!confirm('确定要删除这个音乐项目吗？')) return
    try {
      await deleteMusicProject(params.id)
      router.push('/music')
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

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">音乐项目不存在</p>
          <Button
            onClick={() => router.push('/music')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(project.status)
  const StatusIcon = statusConfig.icon

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
            <Link href="/music" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">音乐项目详情</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-cyan-600 hover:bg-cyan-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-md">
              <Disc className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  {project.title}
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                {project.field} · 创建于 {formatDate(project.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* 信息卡片 */}
        <div className="grid gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">项目名称</p>
                  <p className="text-slate-900 font-medium">{project.title}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">领域</p>
                  <p className="text-slate-900 font-medium">{project.field}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    创建时间
                  </p>
                  <p className="text-slate-900 font-medium">{formatDate(project.createdAt)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    更新时间
                  </p>
                  <p className="text-slate-900 font-medium">{formatDate(project.updatedAt)}</p>
                </div>
              </div>

              {project.description && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    项目描述
                  </p>
                  <p className="text-slate-900">{project.description}</p>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-3">音频设置</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">采样率</p>
                    <p className="text-slate-900 font-medium">{project.sampleRate / 1000}kHz</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">比特率</p>
                    <p className="text-slate-900 font-medium">{project.bitrate / 1000}kbps</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">格式</p>
                    <p className="text-slate-900 font-medium">{project.format}</p>
                  </div>
                </div>
              </div>

              {project.prompt && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    提示词
                  </p>
                  <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{project.prompt}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 生成的音频 */}
          {project.tocData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Music className="w-5 h-5 text-cyan-500" />
                  生成的音频
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg">
                        <Music className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {project.tocData.name || `${project.title}.mp3`}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {project.format.toUpperCase()} · {project.bitrate / 1000}kbps
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlay}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isPlaying
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 shadow-lg'
                            : 'bg-white hover:bg-cyan-50 text-cyan-600 shadow-sm border border-cyan-200'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            暂停
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            播放
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors shadow-sm border border-slate-200 disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        下载
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* 底部装饰 */}
      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}
