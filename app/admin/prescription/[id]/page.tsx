'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import {
  Pill, Trash2, FileText, Calendar, Music, Play, Pause, Download, Loader2, Edit,
} from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

type Prescription = {
  id: string; name: string | null; prompt: string | null; arguments: string | null; etag: string | null; createdAt: Date; updatedAt: Date
}
type TocDataInfo = { id: string; name: string | null }

async function fetchPrescription(id: string): Promise<Prescription> {
  const res = await fetch(`/api/admin/prescription/${id}`)
  if (!res.ok) throw new Error('获取处方详情失败')
  return res.json()
}
async function deletePrescription(id: string): Promise<void> {
  const res = await fetch(`/api/admin/prescription/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除处方失败')
}

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function PrescriptionDetailPage({ params }: { params: { id: string } }) {
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

  const linkedAudioFiles: TocDataInfo[] = (() => {
    if (!prescription?.arguments) return []
    try { return JSON.parse(prescription.arguments).audioFiles || [] } catch { return [] }
  })()

  const loadPrescription = async () => {
    try {
      const data = await fetchPrescription(params.id)
      setPrescription(data)
      setEditData({ name: data.name || '', prompt: data.prompt || '', arguments: data.arguments || '' })
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadPrescription() }, [params.id])
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])

  const handleDelete = async () => {
    if (!confirm('确定要删除这个处方吗？')) return
    try { await deletePrescription(params.id); router.push('/admin/prescription') }
    catch { alert('删除失败，请稍后重试') }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/prescription/${params.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData),
      })
      if (!res.ok) throw new Error('保存失败')
      setPrescription(await res.json())
      setIsEditing(false)
    } catch { alert('保存失败，请稍后重试') }
    finally { setIsSaving(false) }
  }

  const handlePlay = () => {
    if (isPlaying && audioRef.current) { audioRef.current.pause(); setIsPlaying(false); setPlayingStatus(0); return }
    if (playingStatus === 1) return
    setPlayingStatus(1)
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/admin/prescription/${params.id}/stream`)
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
      audioRef.current.addEventListener('error', () => { alert('音频播放失败'); setIsPlaying(false) })
      audioRef.current.addEventListener('canplay', () => { audioRef.current?.play(); setIsPlaying(true); setPlayingStatus(0) })
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/admin/prescription/${params.id}/download`)
      if (!res.ok) { const d = await res.json(); alert(d.error || '下载失败'); return }
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${prescription?.name || '处方音频'}.mp3`
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch { alert('下载失败，请重试') } finally { setIsDownloading(false) }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dddddd] border-t-[#222222]" />
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6a6a6a] mb-4">处方不存在</p>
          <button onClick={() => router.push('/admin/prescription')} className="h-10 px-5 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41]">返回列表</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader
        subtitle="处方详情"
        backHref="/admin/prescription"
        backLabel="返回列表"
        action={{ label: isEditing ? '取消编辑' : '编辑', onClick: () => setIsEditing(!isEditing) }}
      />

      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">{prescription.name || '未命名处方'}</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> 创建于 {formatDate(prescription.createdAt)}
          </p>
        </div>

        <div className="space-y-6">
          {/* 处方信息 */}
          <div className="border border-[#dddddd] rounded-[14px] p-6">
            <h3 className="text-[16px] font-semibold text-[#222222] mb-5">处方信息</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-[14px] text-[#222222]">处方名称</Label>
                  <input type="text" value={editData.name} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-12 mt-1.5 px-3 border border-[#dddddd] rounded-lg text-[14px] focus:outline-none focus:border-[#222222]" />
                </div>
                <div>
                  <Label className="text-[14px] text-[#222222]">提示词</Label>
                  <textarea value={editData.prompt} onChange={(e) => setEditData(prev => ({ ...prev, prompt: e.target.value }))}
                    rows={6} className="w-full mt-1.5 px-3 py-2 border border-[#dddddd] rounded-lg text-[14px] font-mono focus:outline-none focus:border-[#222222]" />
                </div>
                <div>
                  <button type="button" onClick={() => setShowArguments(!showArguments)}
                    className="text-[14px] text-[#6a6a6a] flex items-center gap-1 hover:text-[#222222]">
                    附加参数 <span className="text-[12px]">{showArguments ? '▼' : '▶'}</span>
                  </button>
                  {showArguments && (
                    <textarea value={editData.arguments} onChange={(e) => setEditData(prev => ({ ...prev, arguments: e.target.value }))}
                      rows={3} className="w-full mt-2 px-3 py-2 border border-[#dddddd] rounded-lg text-[14px] font-mono focus:outline-none focus:border-[#222222]" />
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={isSaving}
                    className="h-12 px-6 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41] transition-colors flex items-center gap-2 disabled:opacity-50">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} 保存
                  </button>
                  <button onClick={() => setIsEditing(false)}
                    className="h-12 px-6 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[12px] text-[#929292] mb-1">处方名称</p><p className="text-[14px] text-[#222222] font-medium">{prescription.name || '-'}</p></div>
                  <div><p className="text-[12px] text-[#929292] mb-1">更新时间</p><p className="text-[14px] text-[#222222]">{formatDate(prescription.updatedAt)}</p></div>
                </div>
                {prescription.prompt && (
                  <div className="pt-4 border-t border-[#ebebeb]">
                    <p className="text-[12px] text-[#929292] mb-2">提示词</p>
                    <p className="text-[14px] text-[#3f3f3f] bg-[#f7f7f7] p-4 rounded-lg whitespace-pre-wrap font-mono">{prescription.prompt}</p>
                  </div>
                )}
                {linkedAudioFiles.length > 0 && (
                  <div className="pt-4 border-t border-[#ebebeb]">
                    <p className="text-[12px] text-[#929292] mb-2">关联音频文件</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedAudioFiles.map(file => (
                        <span key={file.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f7f7f7] text-[13px] text-[#222222]">
                          <Music className="w-3.5 h-3.5 text-[#6a6a6a]" /> {file.name || '未命名'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {prescription.arguments && !linkedAudioFiles.length && (
                  <div className="pt-4 border-t border-[#ebebeb]">
                    <button type="button" onClick={() => setShowArguments(!showArguments)}
                      className="text-[14px] text-[#6a6a6a] flex items-center gap-1 hover:text-[#222222]">
                      附加参数 <span className="text-[12px]">{showArguments ? '▼' : '▶'}</span>
                    </button>
                    {showArguments && (
                      <p className="mt-2 text-[14px] text-[#3f3f3f] bg-[#f7f7f7] p-4 rounded-lg whitespace-pre-wrap font-mono">{prescription.arguments}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 生成结果 */}
          {prescription.key && (
            <div className="border border-[#dddddd] rounded-[14px] p-6">
              <h3 className="text-[16px] font-semibold text-[#222222] mb-5">生成结果</h3>
              <div className="bg-[#f7f7f7] rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-[#222222]">{prescription.name || '处方音频'}</p>
                    <p className="text-[13px] text-[#6a6a6a] mt-1">MP3</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handlePlay}
                      className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-colors flex items-center gap-2 ${isPlaying ? 'bg-[#222222] text-white' : 'border border-[#dddddd] text-[#222222] hover:border-[#222222]'}`}>
                      {isPlaying ? <><Pause className="w-4 h-4" /> 暂停</> : <><Play className="w-4 h-4" /> {playingStatus === 0 ? '播放' : '加载中'}</>}
                    </button>
                    <button onClick={handleDownload} disabled={isDownloading}
                      className="h-10 px-5 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 下载
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作 */}
          <div className="flex justify-end">
            <button onClick={handleDelete}
              className="h-10 px-5 rounded-lg text-[14px] font-medium text-[#c13515] hover:bg-red-50 transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> 删除处方
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
