'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Pill,
  Plus,
  Trash2,
  Search,
  FileText,
  Calendar,
} from 'lucide-react'
import AdminPageHeader from '@/components/layout/AdminPageHeader'

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

async function fetchPrescriptions(page = 1, pageSize = 20, search = ''): Promise<{
  data: Prescription[]
  pagination: PaginationInfo
}> {
  const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) params.set('search', search)
  const res = await fetch(`/api/admin/prescription?${params}`)
  if (!res.ok) throw new Error('获取处方列表失败')
  return res.json()
}

async function deletePrescription(id: string): Promise<void> {
  const res = await fetch(`/api/admin/prescription/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除处方失败')
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PrescriptionPage() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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

  useEffect(() => { loadPrescriptions() }, [loadPrescriptions])

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dddddd] border-t-[#222222]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminPageHeader
        subtitle="处方管理"
        action={{ label: '新建处方', onClick: () => router.push('/admin/prescription/new') }}
      />

      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-medium text-[#222222]">处方管理</h2>
          <p className="text-[14px] text-[#6a6a6a] mt-1">管理音频编辑处方模板</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929292]" />
            <Input
              type="text"
              placeholder="搜索处方名称或提示词..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="pl-10 h-12 border-[#dddddd] rounded-lg text-[14px] focus:border-[#222222] focus:ring-[#222222]"
            />
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div className="text-center py-24 border border-[#ebebeb] rounded-[14px]">
            <Pill className="w-12 h-12 text-[#dddddd] mx-auto mb-4" />
            <h3 className="text-[16px] font-semibold text-[#222222] mb-2">
              {searchTerm ? '未找到匹配的处方' : '暂无处方'}
            </h3>
            <p className="text-[14px] text-[#6a6a6a] mb-8">
              {searchTerm ? '请尝试其他搜索关键词' : '创建您的第一个处方模板，快速生成音频'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/admin/prescription/new')}
                className="h-12 px-8 rounded-lg bg-[#ff385c] text-white text-[16px] font-medium hover:bg-[#e00b41] transition-colors"
              >
                创建第一个处方
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="p-5 rounded-[14px] border border-[#dddddd] bg-gradient-to-br from-white via-purple-50/30 to-pink-50/40 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] transition-shadow cursor-pointer"
                onClick={() => router.push(`/admin/prescription/${prescription.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-semibold text-[#222222] truncate">
                      {prescription.name || '未命名处方'}
                    </h3>
                    <p className="text-[13px] text-[#6a6a6a] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(prescription.createdAt)}
                    </p>
                  </div>
                </div>
                {prescription.prompt && (
                  <div className="flex items-start gap-2 text-[14px] text-[#6a6a6a] mb-3">
                    <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{prescription.prompt}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/admin/prescription/${prescription.id}`) }}
                    className="flex-1 h-9 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={(e) => handleDelete(prescription.id, e)}
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-[#6a6a6a] hover:text-[#c13515] hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-9 px-4 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-[14px] text-[#6a6a6a]">第 {currentPage} / {pagination.totalPages} 页</span>
            <button
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              className="h-9 px-4 rounded-lg text-[14px] font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
