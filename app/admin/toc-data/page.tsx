'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Database,
  Plus,
  Search,
  FileText,
  Trash2,
  Loader2,
  Download,
  HardDrive,
  Play,
  Pause,
} from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

type TocData = {
  id: string
  name: string | null
  key: string | null
  createdAt: Date
  updatedAt: Date
}

async function fetchTocDataList(): Promise<TocData[]> {
  const res = await fetch('/api/admin/toc-data')
  if (!res.ok) throw new Error('获取文件列表失败')
  const data = await res.json()
  return data.tocDataList || []
}

async function deleteTocData(id: string): Promise<void> {
  const res = await fetch(`/api/admin/toc-data/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除文件失败')
}

async function downloadTocData(id: string): Promise<void> {
  const res = await fetch(`/api/admin/toc-data/${id}/download`)
  if (!res.ok) {
    const data = await res.json()
    alert(data.error || '下载失败')
    return
  }
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  let fileName = 'download'
  if (contentDisposition) {
    const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;'"]*)/i)
    if (match) fileName = decodeURIComponent(match[1])
  }
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getFileName = (key: string | null) => {
  if (!key) return '-'
  const parts = key.split('/')
  return parts[parts.length - 1]
}

export default function AdminTocDataPage() {
  const router = useRouter()
  const [tocDataList, setTocDataList] = useState<TocData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const loadTocDataList = useCallback(async () => {
    try {
      const data = await fetchTocDataList()
      setTocDataList(data)
    } catch (error) {
      console.error('Failed to load toc data list:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadTocDataList() }, [loadTocDataList])

  const filteredList = tocDataList.filter(item =>
    !searchTerm ||
    (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.key && item.key.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个文件吗？')) return
    try {
      await deleteTocData(id)
      await loadTocDataList()
    } catch (error) {
      console.error('Failed to delete toc data:', error)
      alert('删除失败，请稍后重试')
    }
  }

  const handleDownload = async (id: string) => {
    setDownloadingId(id)
    try {
      await downloadTocData(id)
    } catch (error) {
      console.error('Failed to download toc data:', error)
      alert('下载失败，请稍后重试')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePlay = (id: string) => {
    if (playingId === id && audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    audioRef.current = new Audio(`/api/admin/toc-data/${id}/stream`)
    audioRef.current.addEventListener('ended', () => setPlayingId(null))
    audioRef.current.addEventListener('error', () => {
      alert('音频播放失败')
      setPlayingId(null)
    })
    audioRef.current.play()
    setPlayingId(id)
  }

  const isAudioFile = (fileName: string) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dddddd] border-t-[#222222]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader
        subtitle="文件管理"
        action={{ label: '上传文件', onClick: () => router.push('/admin/toc-data/new') }}
      />

      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">文件管理</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1">管理上传的文件数据</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929292]" />
            <Input
              type="text"
              placeholder="搜索文件名或 Key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-[#dddddd] rounded-lg text-[14px] focus:border-[#222222] focus:ring-[#222222]"
            />
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-24 border border-[#ebebeb] rounded-[14px]">
            <Database className="w-12 h-12 text-[#dddddd] mx-auto mb-4" />
            <h3 className="text-[16px] font-semibold text-[#222222] mb-2">暂无文件数据</h3>
            <p className="text-[14px] text-[#6a6a6a] mb-8">点击「上传文件」开始添加文件</p>
            <button
              onClick={() => router.push('/admin/toc-data/new')}
              className="h-12 px-8 rounded-lg bg-[#ff385c] text-white text-[16px] font-medium hover:bg-[#e00b41] transition-colors"
            >
              上传第一个文件
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-[14px] border border-[#dddddd] bg-gradient-to-br from-white via-cyan-50/30 to-sky-50/40 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-semibold text-[#222222] truncate">
                      {item.name || getFileName(item.key)}
                    </h3>
                    <p className="text-[13px] text-[#6a6a6a]">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[12px] text-[#929292] font-mono break-all mb-4">
                  {item.key || '-'}
                </div>
                <div className="flex items-center gap-2">
                  {isAudioFile(item.key || '') && (
                    <button
                      onClick={() => handlePlay(item.id)}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                        playingId === item.id
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-[#6a6a6a] hover:text-[#222222] hover:bg-[#f7f7f7]'
                      }`}
                    >
                      {playingId === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(item.id)}
                    disabled={downloadingId === item.id}
                    className="flex-1 h-9 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors flex items-center justify-center gap-1"
                  >
                    {downloadingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    下载
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-[#6a6a6a] hover:text-[#c13515] hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
