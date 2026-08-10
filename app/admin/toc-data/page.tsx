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
  Tags,
  X,
} from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

type LabelItem = {
  id: string
  name: string
}

type TocData = {
  id: string
  name: string | null
  key: string | null
  createdAt: Date
  updatedAt: Date
  labels: LabelItem[]
}

type AllLabel = {
  id: string
  name: string
  count: number
}

const MAX_LABELS_PER_FILE = 8

async function fetchTocDataList(): Promise<TocData[]> {
  const res = await fetch('/api/admin/toc-data')
  if (!res.ok) throw new Error('获取文件列表失败')
  const data = await res.json()
  return (data.tocDataList || []).map((item: TocData) => ({ ...item, labels: item.labels || [] }))
}

async function fetchAllLabels(): Promise<AllLabel[]> {
  const res = await fetch('/api/admin/toc-data/labels')
  if (!res.ok) throw new Error('获取标签列表失败')
  const data = await res.json()
  return data.labelList || []
}

async function updateTocDataLabels(id: string, labels: string[]): Promise<LabelItem[]> {
  const res = await fetch(`/api/admin/toc-data/${id}/labels`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '更新标签失败')
  }
  const data = await res.json()
  return data.labels || []
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

  // 标签编辑相关状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLabels, setDraftLabels] = useState<string[]>([])
  const [labelInput, setLabelInput] = useState('')
  const [allLabels, setAllLabels] = useState<AllLabel[]>([])
  const [savingLabels, setSavingLabels] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  const loadAllLabels = useCallback(async () => {
    try {
      setAllLabels(await fetchAllLabels())
    } catch (error) {
      console.error('Failed to load labels:', error)
    }
  }, [])

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

  useEffect(() => {
    loadTocDataList()
    loadAllLabels()
  }, [loadTocDataList, loadAllLabels])

  const handleStartEdit = (item: TocData) => {
    setEditingId(item.id)
    setDraftLabels(item.labels.map((l) => l.name))
    setLabelInput('')
    loadAllLabels()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setDraftLabels([])
    setLabelInput('')
  }

  const addDraftLabel = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (draftLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setLabelInput('')
      return
    }
    if (draftLabels.length >= MAX_LABELS_PER_FILE) {
      alert(`最多添加 ${MAX_LABELS_PER_FILE} 个标签`)
      return
    }
    setDraftLabels([...draftLabels, trimmed])
    setLabelInput('')
  }

  const removeDraftLabel = (name: string) => {
    setDraftLabels(draftLabels.filter((l) => l !== name))
  }

  const handleSaveLabels = async (item: TocData) => {
    // 输入框中未确认的文字也作为新标签保存
    const pending = labelInput.trim()
    const finalLabels =
      pending && !draftLabels.some((l) => l.toLowerCase() === pending.toLowerCase())
        ? [...draftLabels, pending]
        : draftLabels

    setSavingLabels(true)
    try {
      const labels = await updateTocDataLabels(item.id, finalLabels)
      setTocDataList((list) => list.map((d) => (d.id === item.id ? { ...d, labels } : d)))
      handleCancelEdit()
      loadAllLabels()
    } catch (error) {
      console.error('Failed to save labels:', error)
      alert(error instanceof Error ? error.message : '保存标签失败')
    } finally {
      setSavingLabels(false)
    }
  }

  // 编辑时的候选标签：已使用过、未在当前草稿中、且匹配输入内容
  const suggestions = allLabels
    .filter((l) => !draftLabels.some((d) => d.toLowerCase() === l.name.toLowerCase()))
    .filter(
      (l) => !labelInput.trim() || l.name.toLowerCase().includes(labelInput.trim().toLowerCase())
    )
    .slice(0, 12)

  const filteredList = tocDataList.filter((item) => {
    const matchSearch =
      !searchTerm ||
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.key && item.key.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchLabel =
      !selectedLabel || item.labels.some((l) => l.name === selectedLabel)
    return matchSearch && matchLabel
  })

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个文件吗？')) return
    try {
      await deleteTocData(id)
      await loadTocDataList()
      loadAllLabels()
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

          {allLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {allLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() =>
                    setSelectedLabel(selectedLabel === label.name ? null : label.name)
                  }
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[13px] transition-colors ${
                    selectedLabel === label.name
                      ? 'bg-[#222222] border-[#222222] text-white'
                      : 'bg-white border-[#dddddd] text-[#6a6a6a] hover:border-[#222222] hover:text-[#222222]'
                  }`}
                >
                  {label.name}
                  <span className={selectedLabel === label.name ? 'text-white/60' : 'text-[#c2c2c2]'}>
                    {label.count}
                  </span>
                </button>
              ))}
              {selectedLabel && (
                <button
                  type="button"
                  onClick={() => setSelectedLabel(null)}
                  className="px-3 py-1 rounded-full text-[13px] text-[#929292] hover:text-[#222222] transition-colors"
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
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

                {editingId === item.id ? (
                  <div className="mb-4 p-3 rounded-lg border border-[#ebebeb] bg-white space-y-2">
                    <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                      {draftLabels.length === 0 && (
                        <span className="text-[12px] text-[#929292]">暂无标签，请添加</span>
                      )}
                      {draftLabels.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-[12px] text-sky-700"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => removeDraftLabel(name)}
                            className="text-sky-400 hover:text-sky-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addDraftLabel(labelInput)
                          }
                        }}
                        placeholder="输入新标签后回车，或从下方已用标签中选择"
                        className="h-9 text-[13px] border-[#dddddd] rounded-lg focus:border-[#222222] focus:ring-[#222222]"
                      />
                      {suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-[#dddddd] rounded-lg shadow-lg max-h-40 overflow-y-auto p-1">
                          <p className="text-[11px] text-[#929292] px-2 py-1">使用过的标签</p>
                          {suggestions.map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addDraftLabel(l.name)
                              }}
                              className="w-full text-left px-2 py-1.5 text-[13px] text-[#222222] hover:bg-[#f7f7f7] rounded flex items-center justify-between"
                            >
                              <span>{l.name}</span>
                              <span className="text-[11px] text-[#929292]">{l.count} 个文件</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 h-8 rounded-lg border border-[#dddddd] text-[13px] text-[#222222] hover:border-[#222222] transition-colors"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveLabels(item)}
                        disabled={savingLabels}
                        className="flex-1 h-8 rounded-lg bg-[#ff385c] text-white text-[13px] font-medium hover:bg-[#e00b41] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {savingLabels && <Loader2 className="w-3 h-3 animate-spin" />}
                        保存标签
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-4 min-h-[26px]">
                    {item.labels.length === 0 && (
                      <span className="text-[12px] text-[#c2c2c2]">无标签</span>
                    )}
                    {item.labels.map((label) => (
                      <span
                        key={label.id}
                        className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-[12px] text-sky-700"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

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
                    onClick={() => (editingId === item.id ? handleCancelEdit() : handleStartEdit(item))}
                    title="编辑标签"
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                      editingId === item.id
                        ? 'text-sky-600 bg-sky-50'
                        : 'text-[#6a6a6a] hover:text-[#222222] hover:bg-[#f7f7f7]'
                    }`}
                  >
                    <Tags className="w-4 h-4" />
                  </button>
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
