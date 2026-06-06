'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Disc,
  ArrowLeft,
  Save,
  Sparkles,
  Loader2,
  Music,
  Plus,
  CheckCircle2,
} from 'lucide-react'

// 类型定义
type MusicCover = {
  id: string
  name: string | null
  audioDuration: number | null
  status: string
  createdAt: Date
}

type MusicCoverResource = {
  id: string
  musicCoverId: string
  musicCover: MusicCover
}

type MusicProject = {
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

// API 调用函数
async function fetchMusicProject(id: string): Promise<MusicProject> {
  const res = await fetch(`/api/admin/music/${id}`)
  if (!res.ok) throw new Error('获取音乐项目详情失败')
  return res.json()
}

async function fetchMusicCovers(): Promise<{ data: MusicCover[] }> {
  const res = await fetch('/api/music-covers')
  if (!res.ok) throw new Error('获取音乐母带失败')
  return res.json()
}

async function updateMusicProject(
  id: string,
  data: {
    title?: string
    field?: string
    description?: string
    status?: string
    prompt?: string
    sampleRate?: number
    bitrate?: number
    format?: string
    musicCoverIds?: string[]
  }
): Promise<MusicProject> {
  const res = await fetch(`/api/admin/music/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('更新音乐项目失败')
  return res.json()
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

// 格式化时长
const formatDuration = (seconds: number | null) => {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function EditMusicProjectPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [project, setProject] = useState<MusicProject | null>(null)
  const [musicCovers, setMusicCovers] = useState<MusicCover[]>([])
  const [formData, setFormData] = useState({
    title: '',
    field: '',
    description: '',
    status: 'DRAFT',
    prompt: '',
    sampleRate: '44100',
    bitrate: '256000',
    format: 'mp3',
    musicCoverId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载音乐项目详情和音乐母带列表
  useEffect(() => {
    const loadData = async () => {
      try {
        const projectData=await fetchMusicProject(params.id)
        setProject(projectData)
        setFormData({
          title: projectData.title,
          field: projectData.field,
          description: projectData.description || '',
          status: projectData.status,
          prompt: projectData.prompt || '',
          sampleRate: projectData.sampleRate.toString(),
          bitrate: projectData.bitrate.toString(),
          format: projectData.format,
          musicCoverId: projectData.musicCovers.length > 0 ? projectData.musicCovers[0].musicCoverId : '',
        })
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [params.id])

  // 更新表单
  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = '请输入项目名称'
    if (!formData.field.trim()) newErrors.field = '请输入领域'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await updateMusicProject(params.id, {
        title: formData.title.trim() || undefined,
        field: formData.field.trim() || undefined,
        description: formData.description.trim() || undefined,
        status: formData.status,
        prompt: formData.prompt.trim() || undefined,
        sampleRate: parseInt(formData.sampleRate),
        bitrate: parseInt(formData.bitrate),
        format: formData.format,
        musicCoverIds: formData.musicCoverId ? [formData.musicCoverId] : [],
      })

      router.push(`/admin/music/${params.id}`)
    } catch (error) {
      console.error('Failed to update music project:', error)
      alert('更新失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
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
            <Link href={`/admin/music/${project.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">编辑音乐项目</p>
              </div>
            </Link>
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-md">
              <Disc className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">编辑音乐项目</h1>
              <p className="text-sm text-slate-500">修改项目信息</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-slate-800">
                  项目名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="例如：我的首张专辑"
                  className={errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="field" className="text-slate-800">
                  领域 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="field"
                  value={formData.field}
                  onChange={(e) => updateForm('field', e.target.value)}
                  placeholder="例如：流行音乐"
                  className={errors.field ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}
                />
                {errors.field && (
                  <p className="mt-1 text-sm text-red-500">{errors.field}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-slate-800">
                  项目描述
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="描述一下这个音乐项目的内容和目标..."
                  rows={4}
                  className="border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="status" className="text-slate-800">
                  状态
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => updateForm('status', value)}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="ANALYZING">分析中</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="FAILED">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>


          {/* 音频设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-cyan-500" />
                音频设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sampleRate" className="text-slate-800">
                    采样率 (Hz)
                  </Label>
                  <Select
                    value={formData.sampleRate}
                    onValueChange={(value) => updateForm('sampleRate', value)}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="44100">44100</SelectItem>
                      <SelectItem value="48000">48000</SelectItem>
                      <SelectItem value="96000">96000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bitrate" className="text-slate-800">
                    比特率 (kbps)
                  </Label>
                  <Select
                    value={formData.bitrate}
                    onValueChange={(value) => updateForm('bitrate', value)}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128000">128</SelectItem>
                      <SelectItem value="192000">192</SelectItem>
                      <SelectItem value="256000">256</SelectItem>
                      <SelectItem value="320000">320</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="format" className="text-slate-800">
                    格式
                  </Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => updateForm('format', value)}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                      <SelectItem value="flac">FLAC</SelectItem>
                      <SelectItem value="m4a">M4A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="prompt" className="text-slate-800">
                  提示词 (可选)
                </Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => updateForm('prompt', e.target.value)}
                  placeholder="用于 AI 生成的提示词..."
                  rows={3}
                  className="border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex items-center gap-4 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="text-slate-600 hover:text-slate-800"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-lg shadow-cyan-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存更改
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* 底部装饰 */}
      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}
