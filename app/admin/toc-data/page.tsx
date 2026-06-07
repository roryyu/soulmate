'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

// 类型定义
type TocData = {
  id: string
  name: string | null
  key: string | null
  createdAt: Date
  updatedAt: Date
}

// API 调用函数
async function fetchTocDataList(): Promise<TocData[]> {
  const res = await fetch('/api/admin/toc-data')
  if (!res.ok) throw new Error('获取文件列表失败')
  const data = await res.json()
  return data.tocDataList || []
}

async function deleteTocData(id: string): Promise<void> {
  const res = await fetch(`/api/admin/toc-data/${id}`, {
    method: 'DELETE',
  })
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

// 粒子背景组件
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-sky-400/20 rounded-full"
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

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 获取文件名
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

  // 加载文件列表
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
  }, [loadTocDataList])

  // 过滤结果
  const filteredList = tocDataList.filter(item =>
    !searchTerm ||
    (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.key && item.key.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 处理删除
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

  // 处理下载
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

  // 处理播放
  const handlePlay = (id: string) => {
    if (playingId === id && audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
      return
    }

    // 停止之前的播放
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

  // 判断是否为音频文件
  const isAudioFile = (fileName: string) => {
    return /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-sky-50/50 via-white to-white"
    >
      {/* 粒子背景 */}
      <ParticleBackground />

      {/* 背景光晕装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">文件管理</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/admin/toc-data/new')}
                size="sm"
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                上传文件
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-md">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">文件管理</h1>
              <p className="text-sm text-slate-500">管理上传的文件数据</p>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="搜索文件名或 Key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* 文件列表 */}
        {filteredList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sky-100 to-blue-100 rounded-3xl flex items-center justify-center mb-6">
              <Database className="w-12 h-12 text-sky-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">暂无文件数据</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              点击「上传文件」开始添加文件
            </p>
            <Button
              onClick={() => router.push('/admin/toc-data/new')}
              size="lg"
              className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 shadow-lg shadow-sky-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              上传第一个文件
            </Button>
          </motion.div>
        ) : (
          /* 文件卡片网格 */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {filteredList.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-xl transition-all duration-300 border-slate-100">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                            {item.name || getFileName(item.key)}
                          </CardTitle>
                          <p className="text-xs text-slate-500">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2 font-mono text-xs break-all">
                          {item.key || '-'}
                        </span>
                      </div>

                    </div>
                    <div className="flex items-center gap-2">
                      {isAudioFile(item.key||'') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={playingId === item.id 
                            ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          }
                          onClick={() => handlePlay(item.id)}
                        >
                          {playingId === item.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50"
                        onClick={() => handleDownload(item.id)}
                        disabled={downloadingId === item.id}
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        下载
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* 底部装饰 */}
      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}
