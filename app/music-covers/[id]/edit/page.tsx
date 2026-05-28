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
import {
  Music,
  ArrowLeft,
  Save,
  Sparkles,
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
  createdAt: Date
  updatedAt: Date
}

// API 调用函数
async function fetchMusicCover(id: string): Promise<MusicCover> {
  const res = await fetch(`/api/music-covers/${id}`)
  if (!res.ok) throw new Error('获取音乐母带详情失败')
  return res.json()
}

async function updateMusicCover(
  id: string,
  data: {
    name?: string
    coverFeatureId?: string
    structureResult?: string
    base64data?: string
    audioDuration?: number
  }
): Promise<MusicCover> {
  const res = await fetch(`/api/music-covers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('更新音乐母带失败')
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

export default function EditMusicCoverPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [musicCover, setMusicCover] = useState<MusicCover | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    coverFeatureId: '',
    structureResult: '',
    base64data: '',
    audioDuration: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载音乐母带详情
  useEffect(() => {
    const loadMusicCover = async () => {
      try {
        const data = await fetchMusicCover(params.id)
        setMusicCover(data)
        setFormData({
          name: data.name || '',
          coverFeatureId: data.coverFeatureId || '',
          structureResult: data.structureResult || '',
          base64data: data.base64data || '',
          audioDuration: data.audioDuration?.toString() || '',
        })
      } catch (error) {
        console.error('Failed to load music cover:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadMusicCover()
  }, [params.id])

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = '请输入音乐名称'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 更新表单
  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await updateMusicCover(params.id, {
        name: formData.name.trim() || undefined,
        coverFeatureId: formData.coverFeatureId.trim() || undefined,
        structureResult: formData.structureResult.trim() || undefined,
        base64data: formData.base64data.trim() || undefined,
        audioDuration: formData.audioDuration ? Number(formData.audioDuration) : undefined,
      })

      router.push(`/music-covers/${params.id}`)
    } catch (error) {
      console.error('Failed to update music cover:', error)
      alert('更新失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
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
            <Link href={`/music-covers/${musicCover.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">编辑音乐母带</p>
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
            className="text-slate-600 hover:text-violet-600 hover:bg-violet-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">编辑音乐母带</h1>
              <p className="text-sm text-slate-500">修改音乐信息和内容</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-slate-800">
                  音乐名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="例如：夜曲"
                  className={errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="audioDuration" className="text-slate-800">
                  音频时长（秒，可选）
                </Label>
                <Input
                  id="audioDuration"
                  disabled={true}
                  type="number"
                  value={formData.audioDuration}
                  onChange={(e) => updateForm('audioDuration', e.target.value)}
                  placeholder="例如：180"
                  className="border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="coverFeatureId" className="text-slate-800">
                  封面特征ID（可选）
                </Label>
                <Input
                  id="coverFeatureId"
                  disabled={true}
                  value={formData.coverFeatureId}
                  onChange={(e) => updateForm('coverFeatureId', e.target.value)}
                  placeholder="从音乐预处理服务获取的特征ID"
                  className="border-slate-200"
                />
              </div>

              <div style={{display: 'none'}}>
                <Label htmlFor="base64data" className="text-slate-800">
                  音频 Base64 数据（可选）
                </Label>
                <Textarea
                  id="base64data"
                  disabled={true}
                  value={formData.base64data}
                  onChange={(e) => updateForm('base64data', e.target.value)}
                  placeholder="输入音频的 Base64 编码数据..."
                  rows={6}
                  className="border-slate-200 resize-none font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="structureResult" className="text-slate-800">
                  结构分析（可选）
                </Label>
                <Textarea
                  id="structureResult"
                  disabled={true}
                  value={formData.structureResult}
                  onChange={(e) => updateForm('structureResult', e.target.value)}
                  placeholder="输入音乐结构分析结果..."
                  rows={4}
                  className="border-slate-200 resize-none font-mono text-sm"
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
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-200"
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
