'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Loader2, Music, X, Check, ChevronsUpDown, Pill } from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

type TocData = { id: string; name: string | null; key: string | null; createdAt: Date }

async function createPrescription(data: {
  name: string; prompt?: string; audioFiles?: Array<{ id: string; name: string | null }>; totalDuration?: number
}): Promise<any> {
  const res = await fetch('/api/admin/prescription', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || '创建处方失败') }
  return res.json()
}

async function fetchTocDataList(): Promise<{ tocDataList: TocData[] }> {
  const res = await fetch('/api/admin/toc-data')
  if (!res.ok) throw new Error('获取音频文件列表失败')
  return res.json()
}

export default function NewPrescriptionPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ name: '', prompt: '', totalDuration: '' })
  const [selectedAudioFiles, setSelectedAudioFiles] = useState<TocData[]>([])
  const [tocDataList, setTocDataList] = useState<TocData[]>([])
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchTocDataList()
      .then(data => setTocDataList(data.tocDataList || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSelectAudio = (tocData: TocData) => {
    if (!selectedAudioFiles.find(f => f.id === tocData.id)) {
      setSelectedAudioFiles(prev => [...prev, tocData])
      const current = formData.prompt
      const sep = current && !current.endsWith('\n') ? '\n' : ''
      updateForm('prompt', current + sep + `[音频: ${tocData.name || tocData.id}]`)
    }
    setOpen(false)
  }

  const handleRemoveAudio = (id: string) => {
    const file = selectedAudioFiles.find(f => f.id === id)
    setSelectedAudioFiles(prev => prev.filter(f => f.id !== id))
    if (file) {
      const ref = `[音频: ${file.name || file.id}]`
      updateForm('prompt', formData.prompt.replace(ref, '').replace(/\n\n+/g, '\n').trim())
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = '请输入处方名称'
    if (!formData.totalDuration.trim() || parseInt(formData.totalDuration) <= 0) newErrors.totalDuration = '请输入有效的音乐时长'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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
      alert(error instanceof Error ? error.message : '创建失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableTocData = tocDataList.filter(t => !selectedAudioFiles.find(s => s.id === t.id))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dddddd] border-t-[#222222]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader subtitle="新建处方" backHref="/admin/prescription" backLabel="返回列表" />

      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">新建处方</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1">创建音频编辑处方模板</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="border border-[#dddddd] rounded-[14px] p-6">
            <h3 className="text-[16px] font-semibold text-[#222222] mb-5">基本信息</h3>
            <div>
              <Label htmlFor="name" className="text-[14px] text-[#222222]">
                处方名称 <span className="text-[#ff385c]">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="输入处方名称"
                disabled={isSubmitting}
                className={`mt-1.5 h-12 border-[#dddddd] rounded-lg text-[14px] ${errors.name ? 'border-[#c13515]' : ''}`}
              />
              {errors.name && <p className="mt-1 text-[13px] text-[#c13515]">{errors.name}</p>}
            </div>
          </div>

          {/* 提示词与音频 */}
          <div className="border border-[#dddddd] rounded-[14px] p-6">
            <h3 className="text-[16px] font-semibold text-[#222222] mb-5">提示词与音频</h3>
            <div className="space-y-4">
              {/* 音频文件选择 */}
              <div>
                <Label className="text-[14px] text-[#222222] mb-2 block">关联音频文件</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAudioFiles.map(file => (
                    <div key={file.id} className="flex items-center gap-2 bg-[#f7f7f7] border border-[#dddddd] rounded-lg px-3 py-1.5">
                      <Music className="w-4 h-4 text-[#6a6a6a]" />
                      <span className="text-[13px] text-[#222222]">{file.name || '未命名'}</span>
                      <button type="button" onClick={() => handleRemoveAudio(file.id)} className="text-[#929292] hover:text-[#c13515] transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-12 rounded-lg border-2 border-dashed border-[#dddddd] text-[14px] text-[#6a6a6a] hover:border-[#222222] hover:text-[#222222] transition-colors flex items-center justify-between px-4"
                    >
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> 选择音频文件...</span>
                      <ChevronsUpDown className="w-4 h-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索音频文件..." />
                      <CommandList>
                        <CommandEmpty>未找到音频文件</CommandEmpty>
                        <CommandGroup heading="可用音频文件">
                          {availableTocData.map(tocData => (
                            <CommandItem key={tocData.id} value={tocData.name || tocData.id} onSelect={() => handleSelectAudio(tocData)}>
                              <Check className="mr-2 h-4 w-4 opacity-0" />
                              <Music className="mr-2 h-4 w-4 text-[#929292]" />
                              <span>{tocData.name || '未命名'}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 提示词 */}
              <div>
                <Label htmlFor="prompt" className="text-[14px] text-[#222222]">提示词</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => updateForm('prompt', e.target.value)}
                  placeholder="输入音频编辑的提示词指令..."
                  rows={6}
                  disabled={isSubmitting}
                  className="mt-1.5 border-[#dddddd] rounded-lg text-[14px] font-mono"
                />
                <p className="mt-1 text-[12px] text-[#929292]">提示词将用于 AI 音乐控制，描述您想要的音频编辑方式</p>
              </div>

              {/* 音乐时长 */}
              <div>
                <Label htmlFor="totalDuration" className="text-[14px] text-[#222222]">
                  音乐时长（秒） <span className="text-[#ff385c]">*</span>
                </Label>
                <Input
                  id="totalDuration"
                  type="number"
                  min="1"
                  value={formData.totalDuration}
                  onChange={(e) => updateForm('totalDuration', e.target.value)}
                  placeholder="例如：60"
                  disabled={isSubmitting}
                  className={`mt-1.5 h-12 border-[#dddddd] rounded-lg text-[14px] ${errors.totalDuration ? 'border-[#c13515]' : ''}`}
                />
                {errors.totalDuration && <p className="mt-1 text-[13px] text-[#c13515]">{errors.totalDuration}</p>}
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center gap-3 justify-end">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting}
              className="h-12 px-6 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors">
              取消
            </button>
            <button type="submit" disabled={isSubmitting}
              className="h-12 px-6 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41] transition-colors flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</> : <><Pill className="w-4 h-4" /> 创建处方</>}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
