'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Music,
  Edit,
  Trash2,
  ArrowLeft,
  Clock,
  FileText,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlayCircle,
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

// API 调用函数
async function fetchMusicCover(id: string): Promise<MusicCover> {
  const res = await fetch(`/api/music-covers/${id}`)
  if (!res.ok) throw new Error('获取音乐母带详情失败')
  return res.json()
}

async function deleteMusicCover(id: string): Promise<void> {
  const res = await fetch(`/api/music-covers/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除音乐母带失败')
}

async function reprocessMusicCover(id: string): Promise<MusicCover> {
  const res = await fetch(`/api/music-covers/${id}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('重新预处理失败')
  return res.json()
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

export default function MusicCoverDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [musicCover, setMusicCover] = useState<MusicCover | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReprocessing, setIsReprocessing] = useState(false)

  // 加载音乐母带详情
  const loadMusicCover = async () => {
    try {
      const data = await fetchMusicCover(params.id)
      setMusicCover(data)
    } catch (error) {
      console.error('Failed to load music cover:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMusicCover()
  }, [params.id])

  // 如果状态是处理中，轮询更新
  useEffect(() => {
    if (musicCover?.status === 'processing') {
      const interval = setInterval(loadMusicCover, 3000)
      return () => clearInterval(interval)
    }
  }, [musicCover?.status, params.id])

  // 处理删除
  const handleDelete = async () => {
    if (!confirm('确定要删除这条音乐母带记录吗？')) return
    try {
      await deleteMusicCover(params.id)
      router.push('/music-covers')
    } catch (error) {
      console.error('Failed to delete music cover:', error)
      alert('删除失败，请稍后重试')
    }
  }

  // 重新预处理
  const handleReprocess = async () => {
    setIsReprocessing(true)
    try {
      const updated = await reprocessMusicCover(params.id)
      setMusicCover(updated)
    } catch (error) {
      console.error('Failed to reprocess:', error)
      alert('重新预处理失败，请稍后重试')
    } finally {
      setIsReprocessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (!musicCover) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">音乐母带记录不存在</p>
          <Button
            onClick={() => router.push('/music-covers')}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(musicCover.status)
  const StatusIcon = statusConfig.icon

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
            <Link href="/music-covers" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">音乐母带详情</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                onClick={() => router.push(`/music-covers/${musicCover.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </Button>
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
            className="text-slate-600 hover:text-violet-600 hover:bg-violet-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  {musicCover.name || '未命名音乐'}
                </h1>
                <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                  {musicCover.status === 'processing' ? (
                    <StatusIcon className="w-3 h-3 animate-spin" />
                  ) : (
                    <StatusIcon className="w-3 h-3" />
                  )}
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                创建于 {formatDate(musicCover.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* 信息卡片 */}
        <div className="grid gap-6">
          {/* 音频播放器 */}
          {musicCover.audioFileUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-violet-500" />
                  音频文件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio
                  controls
                  className="w-full"
                  src={musicCover.audioFileUrl}
                />
              </CardContent>
            </Card>
          )}

          {/* 错误信息 */}
          {musicCover.error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  错误信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{musicCover.error}</p>
              </CardContent>
            </Card>
          )}

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
                  <p className="text-sm text-slate-500">音乐名称</p>
                  <p className="text-slate-900 font-medium">
                    {musicCover.name || '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    音频时长
                  </p>
                  <p className="text-slate-900 font-medium">
                    {formatDuration(musicCover.audioDuration)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    创建时间
                  </p>
                  <p className="text-slate-900 font-medium">
                    {formatDate(musicCover.createdAt)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    更新时间
                  </p>
                  <p className="text-slate-900 font-medium">
                    {formatDate(musicCover.updatedAt)}
                  </p>
                </div>
              </div>

              {musicCover.coverFeatureId && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    封面特征ID
                  </p>
                  <p className="text-slate-900 font-mono text-sm bg-slate-50 p-3 rounded-lg">
                    {musicCover.coverFeatureId}
                  </p>
                </div>
              )}

              {/* 重新预处理按钮 */}
              {musicCover.audioFileUrl && musicCover.status !== 'processing' && (
                <div className="pt-4 border-t border-slate-100">
                  <Button
                    onClick={handleReprocess}
                    disabled={isReprocessing}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                  >
                    {isReprocessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        重新分析中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        重新分析音频
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>



          {/* 结构分析 */}
          {musicCover.structureResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  结构分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap text-slate-700 text-sm font-mono">
                  {musicCover.structureResult}
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
