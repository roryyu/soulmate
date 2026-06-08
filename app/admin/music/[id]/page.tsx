'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Disc, Trash2, Clock, FileText, Calendar, AlertCircle,
  CheckCircle2, Loader2, Music, Play, Pause, Download,
} from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

type MusicCover = {
  id: string; name: string | null; base64data: string | null; audioDuration: number | null; status: string; createdAt: Date; updatedAt: Date
}
type MusicCoverResource = { id: string; musicCoverId: string; researchProjectId: string; musicCover: MusicCover }
type TocData = { id: string; name: string | null; key: string | null; etag: string | null; createdAt: Date; updatedAt: Date }
type ResearchProject = {
  id: string; userId: string; title: string; field: string; description: string | null; status: string; prompt: string | null
  sampleRate: number; bitrate: number; format: string; tocDataId: string | null; musicCovers: MusicCoverResource[]; tocData: TocData | null; createdAt: Date; updatedAt: Date
}

async function fetchMusicProject(id: string): Promise<ResearchProject> {
  const res = await fetch(`/api/admin/music/${id}`)
  if (!res.ok) throw new Error('获取音乐项目详情失败')
  return res.json()
}
async function deleteMusicProject(id: string): Promise<void> {
  const res = await fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除音乐项目失败')
}

const formatDate = (date: Date) => new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'DRAFT': return { color: 'bg-[#f7f7f7] text-[#6a6a6a]', label: '草稿', icon: Clock }
    case 'ANALYZING': return { color: 'bg-blue-50 text-blue-600', label: '分析中', icon: Loader2 }
    case 'COMPLETED': return { color: 'bg-emerald-50 text-emerald-600', label: '已完成', icon: CheckCircle2 }
    case 'FAILED': return { color: 'bg-red-50 text-red-600', label: '失败', icon: AlertCircle }
    default: return { color: 'bg-[#f7f7f7] text-[#6a6a6a]', label: status, icon: Clock }
  }
}

export default function MusicProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<ResearchProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const loadProject = async () => {
    try { setProject(await fetchMusicProject(params.id)) }
    catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadProject() }, [params.id])
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])

  const handlePlay = () => {
    if (!project?.tocDataId) return
    if (isPlaying && audioRef.current) { audioRef.current.pause(); setIsPlaying(false); return }
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/admin/toc-data/${project.tocDataId}/stream`)
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
      audioRef.current.addEventListener('error', () => { alert('音频播放失败'); setIsPlaying(false) })
    }
    audioRef.current.play(); setIsPlaying(true)
  }

  const handleDownload = async () => {
    if (!project?.tocDataId) return
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/admin/toc-data/${project.tocDataId}/download`)
      if (!res.ok) { const d = await res.json(); alert(d.error || '下载失败'); return }
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${project.title}.mp3`
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch { alert('下载失败，请重试') } finally { setIsDownloading(false) }
  }

  useEffect(() => {
    if (project?.status === 'ANALYZING') { const i = setInterval(loadProject, 3000); return () => clearInterval(i) }
  }, [project?.status, params.id])

  const handleDelete = async () => {
    if (!confirm('确定要删除这个音乐项目吗？')) return
    try { await deleteMusicProject(params.id); router.push('/admin/music') }
    catch { alert('删除失败，请稍后重试') }
  }

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dddddd] border-t-[#222222]" /></div>
  if (!project) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center"><p className="text-[#6a6a6a] mb-4">音乐项目不存在</p>
        <button onClick={() => router.push('/admin/music')} className="h-10 px-5 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41]">返回列表</button>
      </div>
    </div>
  )

  const statusConfig = getStatusConfig(project.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader subtitle="音乐项目详情" backHref="/admin/music" backLabel="返回列表" />

      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-[22px] font-medium text-[#222222]">{project.title}</h2>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3" />{statusConfig.label}
            </span>
          </div>
          <p className="text-[14px] text-[#6a6a6a]">{project.field} · 创建于 {formatDate(project.createdAt)}</p>
        </div>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="border border-[#dddddd] rounded-[14px] p-6">
            <h3 className="text-[16px] font-semibold text-[#222222] mb-5">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[12px] text-[#929292] mb-1">项目名称</p><p className="text-[14px] text-[#222222] font-medium">{project.title}</p></div>
              <div><p className="text-[12px] text-[#929292] mb-1">领域</p><p className="text-[14px] text-[#222222] font-medium">{project.field}</p></div>
              <div><p className="text-[12px] text-[#929292] mb-1">创建时间</p><p className="text-[14px] text-[#222222]">{formatDate(project.createdAt)}</p></div>
              <div><p className="text-[12px] text-[#929292] mb-1">更新时间</p><p className="text-[14px] text-[#222222]">{formatDate(project.updatedAt)}</p></div>
            </div>
            {project.description && (
              <div className="mt-4 pt-4 border-t border-[#ebebeb]">
                <p className="text-[12px] text-[#929292] mb-1">项目描述</p>
                <p className="text-[14px] text-[#3f3f3f]">{project.description}</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-[#ebebeb]">
              <p className="text-[12px] text-[#929292] mb-3">音频设置</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f7f7f7] p-3 rounded-lg"><p className="text-[12px] text-[#929292] mb-1">采样率</p><p className="text-[14px] text-[#222222] font-medium">{project.sampleRate / 1000}kHz</p></div>
                <div className="bg-[#f7f7f7] p-3 rounded-lg"><p className="text-[12px] text-[#929292] mb-1">比特率</p><p className="text-[14px] text-[#222222] font-medium">{project.bitrate / 1000}kbps</p></div>
                <div className="bg-[#f7f7f7] p-3 rounded-lg"><p className="text-[12px] text-[#929292] mb-1">格式</p><p className="text-[14px] text-[#222222] font-medium">{project.format}</p></div>
              </div>
            </div>
            {project.prompt && (
              <div className="mt-4 pt-4 border-t border-[#ebebeb]">
                <p className="text-[12px] text-[#929292] mb-1">提示词</p>
                <p className="text-[14px] text-[#3f3f3f] bg-[#f7f7f7] p-3 rounded-lg">{project.prompt}</p>
              </div>
            )}
          </div>

          {/* 生成的音频 */}
          {project.tocData && (
            <div className="border border-[#dddddd] rounded-[14px] p-6">
              <h3 className="text-[16px] font-semibold text-[#222222] mb-5">生成的音频</h3>
              <div className="bg-[#f7f7f7] rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-[#222222]">{project.tocData.name || `${project.title}.mp3`}</p>
                    <p className="text-[13px] text-[#6a6a6a] mt-1">{project.format.toUpperCase()} · {project.bitrate / 1000}kbps</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handlePlay} className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-colors flex items-center gap-2 ${isPlaying ? 'bg-[#222222] text-white' : 'border border-[#dddddd] text-[#222222] hover:border-[#222222]'}`}>
                      {isPlaying ? <><Pause className="w-4 h-4" /> 暂停</> : <><Play className="w-4 h-4" /> 播放</>}
                    </button>
                    <button onClick={handleDownload} disabled={isDownloading} className="h-10 px-5 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 下载
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作 */}
          <div className="flex justify-end">
            <button onClick={handleDelete} className="h-10 px-5 rounded-lg text-[14px] font-medium text-[#c13515] hover:bg-red-50 transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> 删除项目
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
