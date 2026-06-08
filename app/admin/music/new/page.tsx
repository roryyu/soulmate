'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2, Disc } from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

type MusicCover = {
  id: string
  name: string | null
  audioDuration: number | null
  status: string
  createdAt: Date
}

async function createMusicProject(data: {
  userId: string
  title: string
  field: string
  description?: string
  status: string
  prompt?: string
  sampleRate?: number
  bitrate?: number
  format?: string
  musicCoverIds?: string[]
}): Promise<any> {
  const res = await fetch('/api/admin/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('创建音乐素材失败')
  return res.json()
}

export default function NewMusicProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '', field: '', description: '', status: 'DRAFT',
    prompt: '', sampleRate: '44100', bitrate: '256000', format: 'mp3', musicCoverId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: session } = useSession()

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = '请输入处方名称'
    if (!formData.field.trim()) newErrors.field = '请输入分类'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const newProject = await createMusicProject({
        userId: session?.user?.id as string,
        title: formData.title.trim(),
        field: formData.field.trim(),
        description: formData.description.trim() || undefined,
        status: 'DRAFT',
        prompt: formData.prompt.trim() || undefined,
        sampleRate: parseInt(formData.sampleRate),
        bitrate: parseInt(formData.bitrate),
        format: formData.format,
        musicCoverIds: formData.musicCoverId ? [formData.musicCoverId] : [],
      })
      router.push(`/admin/music/${newProject.id}`)
    } catch (error) {
      console.error('Failed to create music project:', error)
      alert(error instanceof Error ? error.message : '创建失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader subtitle="新建音乐素材" backHref="/admin/music" backLabel="返回列表" />

      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">新建音乐素材</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1">填写信息创建新的音乐素材</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="border border-[#dddddd] rounded-[14px] p-6">
            <h3 className="text-[16px] font-semibold text-[#222222] mb-5">基本信息</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-[14px] text-[#222222]">
                  名称 <span className="text-[#ff385c]">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  disabled={isSubmitting}
                  className={`mt-1.5 h-12 border-[#dddddd] rounded-lg text-[14px] ${errors.title ? 'border-[#c13515]' : ''}`}
                />
                {errors.title && <p className="mt-1 text-[13px] text-[#c13515]">{errors.title}</p>}
              </div>
              <div>
                <Label htmlFor="field" className="text-[14px] text-[#222222]">
                  分类 <span className="text-[#ff385c]">*</span>
                </Label>
                <Input
                  id="field"
                  value={formData.field}
                  onChange={(e) => updateForm('field', e.target.value)}
                  disabled={isSubmitting}
                  className={`mt-1.5 h-12 border-[#dddddd] rounded-lg text-[14px] ${errors.field ? 'border-[#c13515]' : ''}`}
                />
                {errors.field && <p className="mt-1 text-[13px] text-[#c13515]">{errors.field}</p>}
              </div>
              <div>
                <Label htmlFor="description" className="text-[14px] text-[#222222]">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="描述一下这个音乐素材的内容和目标..."
                  rows={4}
                  disabled={isSubmitting}
                  className="mt-1.5 border-[#dddddd] rounded-lg text-[14px]"
                />
              </div>
            </div>
          </div>

          {/* 音频设置 */}
          <div className="border border-[#dddddd] rounded-[14px] p-6">
            <h3 className="text-[16px] font-semibold text-[#222222] mb-5">音频设置</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-[14px] text-[#222222]">采样率 (Hz)</Label>
                  <Select value={formData.sampleRate} onValueChange={(v) => updateForm('sampleRate', v)}>
                    <SelectTrigger disabled={isSubmitting} className="mt-1.5 h-12 border-[#dddddd] rounded-lg">
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
                  <Label className="text-[14px] text-[#222222]">比特率 (kbps)</Label>
                  <Select value={formData.bitrate} onValueChange={(v) => updateForm('bitrate', v)}>
                    <SelectTrigger disabled={isSubmitting} className="mt-1.5 h-12 border-[#dddddd] rounded-lg">
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
                  <Label className="text-[14px] text-[#222222]">格式</Label>
                  <Select value={formData.format} onValueChange={(v) => updateForm('format', v)}>
                    <SelectTrigger disabled={isSubmitting} className="mt-1.5 h-12 border-[#dddddd] rounded-lg">
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
                <Label htmlFor="prompt" className="text-[14px] text-[#222222]">提示词</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => updateForm('prompt', e.target.value)}
                  placeholder="用于 AI 生成的提示词..."
                  rows={3}
                  disabled={isSubmitting}
                  className="mt-1.5 border-[#dddddd] rounded-lg text-[14px]"
                />
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="h-12 px-6 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-6 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</>
              ) : (
                <><Plus className="w-4 h-4" /> 生成音乐</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
