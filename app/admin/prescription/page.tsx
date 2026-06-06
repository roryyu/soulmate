'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Pill,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  FileText,
  Calendar,
} from 'lucide-react'

// 类型定义
type Prescription = {
  id: string
  name: string | null
  prompt: string | null
  arguments: string | null
  etag: string | null
  createdAt: Date
  updatedAt: Date
}

type PaginationInfo = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// API 调用函数
async function fetchPrescriptions(page = 1, pageSize = 20, search = ''): Promise<{
  data: Prescription[]
  pagination: PaginationInfo
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  if (search) params.set('search', search)

  const res = await fetch(`/api/admin/prescription?${params}`)
  if (!res.ok) throw new Error('获取处方列表失败')
  return res.json()
}

async function deletePrescription(id: string): Promise<void> {
  const res = await fetch(`/api/admin/prescription/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除处方失败')
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

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function PrescriptionPage() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // 加载处方列表
  const loadPrescriptions = useCallback(async () => {
    try {
      const data = await fetchPrescriptions(currentPage, 20, searchTerm)
      setPrescriptions(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to load prescriptions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchTerm])

  useEffect(() => {
    loadPrescriptions()
  }, [loadPrescriptions])

  // 处理删除
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个处方吗？')) return
    try {
      await deletePrescription(id)
      await loadPrescriptions()
    } catch (error) {
      console.error('Failed to delete prescription:', error)
      alert('删除失败，请稍后重试')
    }
  }

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
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">处方管理</p>
              </div>
            </Link>

            <Button
              onClick={() => router.push('/admin/prescription/new')}
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              新建处方
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">处方管理</h1>
              <p className="text-sm text-slate-500">管理音频编辑处方模板</p>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="搜索处方名称或提示词..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 bg-white border-slate-200 focus:border-violet-500 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* 处方列表 */}
        {prescriptions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
              <Pill className="w-12 h-12 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchTerm ? '未找到匹配的处方' : '暂无处方'}
            </h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              {searchTerm ? '请尝试其他搜索关键词' : '创建您的第一个处方模板，快速生成音频'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => router.push('/admin/prescription/new')}
                size="lg"
                className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-8 shadow-lg shadow-violet-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                创建第一个处方
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {prescriptions.map((prescription, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="group hover:shadow-xl transition-all duration-300 border-slate-100 cursor-pointer"
                  onClick={() => router.push(`/admin/prescription/${prescription.id}`)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all">
                          <Pill className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">
                            {prescription.name || '未命名处方'}
                          </CardTitle>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(prescription.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 mb-4">
                      {prescription.prompt && (
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{prescription.prompt}</span>
                        </div>
                      )}
                      {prescription.arguments && (
                        <Badge variant="secondary" className="text-xs">
                          包含参数
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-slate-600 hover:text-violet-600 hover:bg-violet-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/prescription/${prescription.id}`)
                        }}
                      >
                        查看详情
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => handleDelete(prescription.id, e)}
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

        {/* 分页 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className="text-sm text-slate-600">
              第 {currentPage} / {pagination.totalPages} 页
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              下一页
            </Button>
          </div>
        )}
      </main>

      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </motion.div>
  )
}
