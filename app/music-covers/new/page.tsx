'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Music,
  Upload,
  FileAudio,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

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

// 创建音乐母带记录
async function createMusicCover(data: {
  name?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  shouldPreprocess?: boolean
  audioBase64?: string
}): Promise<any> {
  const res = await fetch('/api/music-covers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('创建音乐母带失败')
  return res.json()
}

export default function NewMusicCoverPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [shouldPreprocess, setShouldPreprocess] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'preprocessing' | 'done'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/mp4']
      const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.aac']
      const fileExtension = '.' + selectedFile.name.toLowerCase().split('.').pop()

      if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension || '')) {
        setUploadError('请选择音频文件（.mp3, .wav, .m4a, .flac）')
        return
      }

      // 文件大小限制：50MB
      const maxSize = 50 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setUploadError('文件大小不能超过 50MB')
        return
      }

      setFile(selectedFile)
      setUploadError(null)

      // 自动填充文件名作为音乐名称（如果用户没有填写）
      if (!formData.name) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, name: fileName }))
      }
    }
  }

  // 将文件转换为 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        let base64String = reader.result as string
        // 移除 data:audio/...;base64, 前缀
        base64String = base64String.replace(/^data:audio\/[^;]+;base64,/, '')
        base64String = base64String.replace(/^data:application\/octet-stream;base64,/, '')
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = '请输入音乐名称'
    }
    if (!file) {
      newErrors.file = '请上传音频文件'
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
    setUploadProgress(0)
    setUploadStage('uploading')

    try {
      console.log('📌 ========== 开始处理 ==========')
      console.log('📌 选中文件:', file)
      
      // 1. 先转换文件为 base64
      console.log('📌 转换文件为 Base64...')
      const audioBase64 = await fileToBase64(file!)
      console.log('✅ Base64 长度:', audioBase64.length)
      console.log('✅ Base64 前20字符:', audioBase64.substring(0, 20))
      setUploadProgress(30)

      if (shouldPreprocess) {
        setUploadStage('preprocessing')
      }

      // 2. 创建音乐母带记录，包含文件信息和 base64
      console.log('📌 调用 /api/music-covers 接口...')
      const newMusicCover = await createMusicCover({
        name: formData.name.trim(),
        fileName: file!.name,
        fileType: file!.type,
        fileSize: file!.size,
        shouldPreprocess: shouldPreprocess,
        audioBase64: audioBase64,
      })

      setUploadProgress(100)
      setUploadStage('done')

      console.log('✅ 创建成功，跳转到详情页...')

      // 延迟跳转，让用户看到完成状态
      setTimeout(() => {
        router.push(`/music-covers/${newMusicCover.id}`)
      }, 1000)
    } catch (error) {
      console.error('❌ 失败:', error)
      alert(error instanceof Error ? error.message : '创建失败，请稍后重试')
      setUploadStage('idle')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 获取进度文本
  const getProgressText = () => {
    switch (uploadStage) {
      case 'uploading':
        return '正在上传文件...'
      case 'preprocessing':
        return '正在分析音频（可能需要几分钟）...'
      case 'done':
        return '处理完成！'
      default:
        return ''
    }
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
            <Link href="/music-covers" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmates" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmates</h1>
                <p className="text-xs text-slate-500">上传音乐母带</p>
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
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">上传音乐母带</h1>
              <p className="text-sm text-slate-500">填写信息并上传您的音频文件</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 文件上传区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-violet-500" />
                上传音频文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => !isSubmitting && fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${file ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50'}
                  ${isSubmitting ? 'pointer-events-none opacity-70' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                {file ? (
                  <div className="space-y-2">
                    <div className="w-16 h-16 mx-auto bg-violet-100 rounded-lg flex items-center justify-center">
                      <Music className="w-8 h-8 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {!isSubmitting && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-violet-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFile(null)
                        }}
                      >
                        重新选择
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-900">点击或拖拽文件到这里</p>
                    <p className="text-sm text-slate-500">
                      支持 .mp3, .wav, .m4a, .flac 格式，最大 50MB
                    </p>
                  </div>
                )}
              </div>

              {errors.file && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{errors.file}</p>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{uploadError}</p>
                </div>
              )}

              {/* 进度条 */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {uploadStage === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                    )}
                    <span className="text-sm text-slate-600">{getProgressText()}</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

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
                  disabled={isSubmitting}
                  className={errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* 自动预处理开关 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-800">自动分析音频</Label>
                  <p className="text-sm text-slate-500">
                    上传后自动分析音乐结构、提取歌词（可能需要几分钟）
                  </p>
                </div>
                <Switch
                  checked={shouldPreprocess}
                  onCheckedChange={setShouldPreprocess}
                  disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                  {uploadStage === 'uploading' ? '上传中...' : 
                   uploadStage === 'preprocessing' ? '分析中...' : '处理中...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  上传并创建
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
