'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Pill,
  Trash2,
  ArrowLeft,
  FileText,
  Calendar,
  Music,
  Play,
  Pause,
  Download,
  Loader2,
  Edit,
} from 'lucide-react'

// 类型定义
type Prescription = {
  id: string
  name: string | null
  prompt: string | null
  arguments: string | null
  etag: string | null
  createdAt: Date
  updatedAt: Date
}

type TocDataInfo = {
  id: string
  name: string | null
}

// API 调用函数
async function fetchPrescription(id: string): Promise<Prescription> {
  const res = await fetch(`/api/admin/prescription/${id}`)
  if (!res.ok) throw new Error('获取处方详情失败')
  return res.json()
}

async function deletePrescription(id: string): Promise<void> {
  const res = await fetch(`/api/admin/prescription/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除处方失败')
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

export default function PrescriptionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ name: '', prompt: '', arguments: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingStatus, setPlayingStatus] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showArguments, setShowArguments] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 解析关联的音频文件
  const linkedAudioFiles: TocDataInfo[] = (() => {
    if (!prescription?.arguments) return []
    try {
      const parsed = JSON.parse(prescription.arguments)
      return parsed.audioFiles || []
    } catch {
      return []
    }
  })()

  // 加载处方详情
  const loadPrescription = async () => {
    try {
      const data = await fetchPrescription(params.id)
      setPrescription(data)
      setEditData({
        name: data.name || '',
        prompt: data.prompt || '',
        arguments: data.arguments || '',
      })
    } catch (error) {
      console.error('Failed to load prescription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPrescription()
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

  // 处理删除
  const handleDelete = async () => {
    if (!confirm('确定要删除这个处方吗？')) return
    try {
      await deletePrescription(params.id)
      router.push('/admin/prescription')
    } catch (error) {
      console.error('Failed to delete prescription:', error)
      alert('删除失败，请稍后重试')
    }
  }

  // 保存编辑
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/prescription/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (!res.ok) throw new Error('保存失败')
      const updated = await res.json()
      setPrescription(updated)
      setIsEditing(false)
      alert('保存成功')
    } catch (error) {
      console.error('Failed to save:', error)
      alert('保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 播放音频
  const handlePlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setPlayingStatus(0)
      return
    }
    if (playingStatus === 1) return
    setPlayingStatus(1)
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/admin/prescription/${params.id}/stream`)
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
      audioRef.current.addEventListener('error', () => {
        alert('音频播放失败')
        setIsPlaying(false)
      })
      audioRef.current.addEventListener('canplay', () => {
          console.log('可以播放了');
          audioRef.current.play()
          setIsPlaying(true)
          setPlayingStatus(0)
      });
    }


  }

  // 下载音频
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/admin/prescription/${params.id}/download`)
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '下载失败')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${prescription?.name || '处方音频'}.mp3`
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">处方不存在</p>
          <Button
            onClick={() => router.push('/admin/prescription')}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-white"
    >
      <ParticleBackground />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin/prescription" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">处方详情</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-violet-600 hover:bg-violet-50"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? '取消编辑' : '编辑'}
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
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {prescription.name || '未命名处方'}
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                创建于 {formatDate(prescription.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* 信息卡片 */}
        <div className="grid gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-500" />
                处方信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                /* 编辑模式 */
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-500 mb-1 block">处方名称</Label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500 mb-1 block">提示词</Label>
                    <textarea
                      value={editData.prompt}
                      onChange={(e) => setEditData(prev => ({ ...prev, prompt: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowArguments(!showArguments)}
                      className="text-sm text-slate-500 mb-1 flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      附加参数
                      <span className="text-xs">{showArguments ? '▼' : '▶'}</span>
                    </button>
                    {showArguments && (
                      <textarea
                        value={editData.arguments}
                        onChange={(e) => setEditData(prev => ({ ...prev, arguments: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 font-mono text-sm"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-violet-500 hover:bg-violet-600 text-white"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      保存
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="text-slate-600"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                /* 查看模式 */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">处方名称</p>
                      <p className="text-slate-900 font-medium">{prescription.name || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">更新时间</p>
                      <p className="text-slate-900 font-medium">{formatDate(prescription.updatedAt)}</p>
                    </div>
                  </div>

                  {prescription.prompt && (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        提示词
                      </p>
                      <p className="text-slate-900 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
                        {prescription.prompt}
                      </p>
                    </div>
                  )}

                  {/* 关联音频文件 */}
                  {linkedAudioFiles.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        关联音频文件
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {linkedAudioFiles.map(file => (
                          <Badge key={file.id} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                            <Music className="w-3.5 h-3.5" />
                            {file.name || '未命名'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {prescription.arguments && !linkedAudioFiles.length && (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowArguments(!showArguments)}
                        className="text-sm text-slate-500 flex items-center gap-1 hover:text-slate-700 transition-colors"
                      >
                        附加参数
                        <span className="text-xs">{showArguments ? '▼' : '▶'}</span>
                      </button>
                      {showArguments && (
                        <p className="text-slate-900 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
                          {prescription.arguments}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 生成结果 */}
          {prescription.key && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Music className="w-5 h-5 text-violet-500" />
                  生成结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg">
                        <Music className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{prescription.name || '处方音频'}</p>
                        <p className="text-sm text-slate-500 mt-1">MP3</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlay()}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isPlaying
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 shadow-lg'
                            : 'bg-white hover:bg-violet-50 text-violet-600 shadow-sm border border-violet-200'
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
                            {playingStatus === 0 ? '播放' : '加载中'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownload()}
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

      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}


