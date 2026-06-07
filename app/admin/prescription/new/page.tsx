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
  Pill,
  Plus,
  ArrowLeft,
  Sparkles,
  Loader2,
  Music,
  X,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// 类型定义
type TocData = {
  id: string
  name: string | null
  key: string | null
  createdAt: Date
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

// 创建处方（一次性完成：创建 + AI 生成音频）
async function createPrescription(data: {
  name: string
  prompt?: string
  audioFiles?: Array<{ id: string; name: string | null }>
  totalDuration?: number
}): Promise<any> {
  const res = await fetch('/api/admin/prescription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '创建处方失败')
  }
  return res.json()
}

// 获取 TocData 列表
async function fetchTocDataList(): Promise<{ tocDataList: TocData[] }> {
  const res = await fetch('/api/admin/toc-data')
  if (!res.ok) throw new Error('获取音频文件列表失败')
  return res.json()
}

export default function NewPrescriptionPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    totalDuration: '',
  })
  const [selectedAudioFiles, setSelectedAudioFiles] = useState<TocData[]>([])
  const [tocDataList, setTocDataList] = useState<TocData[]>([])
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载 TocData 列表
  useEffect(() => {
    const loadTocData = async () => {
      try {
        const data = await fetchTocDataList()
        setTocDataList(data.tocDataList || [])
      } catch (error) {
        console.error('Failed to load toc data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTocData()
  }, [])

  // 更新表单
  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 选择音频文件
  const handleSelectAudio = (tocData: TocData) => {
    if (!selectedAudioFiles.find(f => f.id === tocData.id)) {
      setSelectedAudioFiles(prev => [...prev, tocData])
      // 将文件名添加到提示词中
      const currentPrompt = formData.prompt
      const separator = currentPrompt && !currentPrompt.endsWith('\n') ? '\n' : ''
      updateForm('prompt', currentPrompt + separator + `[音频: ${tocData.name || tocData.id}]`)
    }
    setOpen(false)
  }

  // 删除选中的音频文件
  const handleRemoveAudio = (id: string) => {
    const file = selectedAudioFiles.find(f => f.id === id)
    setSelectedAudioFiles(prev => prev.filter(f => f.id !== id))
    // 从提示词中移除对应的引用
    if (file) {
      const ref = `[音频: ${file.name || file.id}]`
      updateForm('prompt', formData.prompt.replace(ref, '').replace(/\n\n+/g, '\n').trim())
    }
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = '请输入处方名称'
    if (!formData.totalDuration.trim() || parseInt(formData.totalDuration) <= 0) newErrors.totalDuration = '请输入有效的音乐时长'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const prescription = await createPrescription({
        name: formData.name.trim(),
        prompt: formData.prompt.trim() || undefined,
        audioFiles: selectedAudioFiles.map(f => ({ id: f.id, name: f.name })),
        totalDuration: parseInt(formData.totalDuration),
      })

      router.push(`/admin/prescription/${prescription.id}`)
    } catch (error) {
      console.error('Failed to create prescription:', error)
      alert(error instanceof Error ? error.message : '创建失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 过滤已选择的文件
  const availableTocData = tocDataList.filter(
    t => !selectedAudioFiles.find(s => s.id === t.id)
  )

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
              <Image src="/logo.jpg" alt="Soulmates" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmates</h1>
                <p className="text-xs text-slate-500">新建处方</p>
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
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">新建处方</h1>
              <p className="text-sm text-slate-500">创建音频编辑处方模板</p>
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
                  处方名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="输入处方名称"
                  disabled={isSubmitting}
                  className={errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 提示词与音频文件 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-violet-500" />
                提示词与音频
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 音频文件选择器 */}
              <div>
                <Label className="text-slate-800 mb-2 block">关联音频文件</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAudioFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5"
                    >
                      <Music className="w-4 h-4 text-violet-500" />
                      <span className="text-sm text-slate-700">{file.name || '未命名'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAudio(file.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between border-dashed border-slate-300 text-slate-500 hover:text-violet-600 hover:border-violet-300"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        选择音频文件...
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索音频文件..." />
                      <CommandList>
                        <CommandEmpty>未找到音频文件</CommandEmpty>
                        <CommandGroup heading="可用音频文件">
                          {availableTocData.map(tocData => (
                            <CommandItem
                              key={tocData.id}
                              value={tocData.name || tocData.id}
                              onSelect={() => handleSelectAudio(tocData)}
                            >
                              <Check
                                className="mr-2 h-4 w-4 opacity-0"
                              />
                              <Music className="mr-2 h-4 w-4 text-slate-400" />
                              <span>{tocData.name || '未命名'}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 提示词输入 */}
              <div>
                <Label htmlFor="prompt" className="text-slate-800">
                  提示词
                </Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => updateForm('prompt', e.target.value)}
                  placeholder="输入音频编辑的提示词指令，例如：将音频的前30秒截取，然后在1分钟处循环插入..."
                  rows={6}
                  disabled={isSubmitting}
                  className="border-slate-200 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">
                  提示词将用于 AI 音乐控制，描述您想要的音频编辑方式
                </p>
              </div>

              {/* 音乐时长 */}
              <div>
                <Label htmlFor="totalDuration" className="text-slate-800">
                  音乐时长（秒） <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalDuration"
                  type="number"
                  min="1"
                  value={formData.totalDuration}
                  onChange={(e) => updateForm('totalDuration', e.target.value)}
                  placeholder="例如：60"
                  disabled={isSubmitting}
                  className={errors.totalDuration ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}
                />
                {errors.totalDuration && (
                  <p className="mt-1 text-sm text-red-500">{errors.totalDuration}</p>
                )}
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
                  创建中...
                </>
              ) : (
                <>
                  <Pill className="w-4 h-4 mr-2" />
                  创建处方
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}
