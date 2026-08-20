'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Package, Plus, Search, CheckCircle, AlertCircle, ArrowLeft, Edit, Trash2, X } from 'lucide-react'
import Link from 'next/link'

// 租户产品类型定义
type TenantProduct = {
  id: string
  name: string | null
  userLimit: number | null
  creditLimit: number | null
  createdAt: string
  updatedAt: string
  _count?: {
    tenants: number
  }
}

// 动画配置
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 }
}

export default function TenantProductManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 状态管理
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  // 创建表单状态
  const [createName, setCreateName] = useState('')
  const [createUserLimit, setCreateUserLimit] = useState('')
  const [createCreditLimit, setCreateCreditLimit] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // 编辑弹窗状态
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editUserLimit, setEditUserLimit] = useState('')
  const [editCreditLimit, setEditCreditLimit] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // 删除确认弹窗状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const [deleteName, setDeleteName] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 获取产品列表
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/tenant-product/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
    } finally {
      setProductsLoading(false)
    }
  }

  // 检查权限和加载数据
  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.role !== 'ADMIN') {
      router.push('/admin/prescription')
      return
    }

    fetchProducts()
  }, [status, session, router])

  // 处理创建产品
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setMessage({ type: '', text: '' })

    if (!createName.trim()) {
      setMessage({ type: 'error', text: '请输入产品名称' })
      setCreateLoading(false)
      return
    }

    const userLimit = createUserLimit ? parseInt(createUserLimit, 10) : undefined
    const creditLimit = createCreditLimit ? parseInt(createCreditLimit, 10) : undefined

    if (createUserLimit && (isNaN(userLimit!) || userLimit! < 0)) {
      setMessage({ type: 'error', text: '用户上限必须为非负整数' })
      setCreateLoading(false)
      return
    }

    if (createCreditLimit && (isNaN(creditLimit!) || creditLimit! < 0)) {
      setMessage({ type: 'error', text: '积分上限必须为非负整数' })
      setCreateLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tenant-product/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), userLimit, creditLimit })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '产品创建成功！' })
        setCreateName('')
        setCreateUserLimit('')
        setCreateCreditLimit('')
        fetchProducts()
        //setActiveTab('list')
      } else {
        setMessage({ type: 'error', text: data.error || '创建产品失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setCreateLoading(false)
    }
  }

  // 打开编辑弹窗
  const openEditModal = (product: TenantProduct) => {
    setEditId(product.id)
    setEditName(product.name || '')
    setEditUserLimit(product.userLimit?.toString() || '')
    setEditCreditLimit(product.creditLimit?.toString() || '')
    setEditModalOpen(true)
    setMessage({ type: '', text: '' })
  }

  // 处理编辑
  const handleEdit = async () => {
    setEditLoading(true)
    setMessage({ type: '', text: '' })

    if (!editName.trim()) {
      setMessage({ type: 'error', text: '请输入产品名称' })
      setEditLoading(false)
      return
    }

    const userLimit = editUserLimit ? parseInt(editUserLimit, 10) : undefined
    const creditLimit = editCreditLimit ? parseInt(editCreditLimit, 10) : undefined

    if (editUserLimit && (isNaN(userLimit!) || userLimit! < 0)) {
      setMessage({ type: 'error', text: '用户上限必须为非负整数' })
      setEditLoading(false)
      return
    }

    if (editCreditLimit && (isNaN(creditLimit!) || creditLimit! < 0)) {
      setMessage({ type: 'error', text: '积分上限必须为非负整数' })
      setEditLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/tenant-product/edit/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), userLimit, creditLimit })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '产品更新成功！' })
        setEditModalOpen(false)
        fetchProducts()
      } else {
        setMessage({ type: 'error', text: data.error || '更新产品失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setEditLoading(false)
    }
  }

  // 打开删除确认弹窗
  const openDeleteModal = (product: TenantProduct) => {
    setDeleteId(product.id)
    setDeleteName(product.name || '未命名产品')
    setDeleteModalOpen(true)
    setMessage({ type: '', text: '' })
  }

  // 处理删除
  const handleDelete = async () => {
    setDeleteLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch(`/api/tenant-product/delete/${deleteId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '产品删除成功！' })
        setDeleteModalOpen(false)
        fetchProducts()
      } else {
        setMessage({ type: 'error', text: data.error || '删除产品失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // 过滤产品列表
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-300/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link
            href="/auth/admin/dashboard"
            className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回系统配置
          </Link>
        </motion.div>

        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl flex items-center justify-center shadow-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">租户产品管理</h1>
          </div>
          <p className="text-slate-500">管理租户套餐产品，配置用户上限和积分上限</p>
        </motion.div>

        {/* 消息提示 */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 flex items-center gap-2 p-4 rounded-xl text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Tab切换 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-1.5 inline-flex shadow-sm border border-slate-100">
             <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-sky-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              创建产品
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'list'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-sky-100'
              }`}
            >
              <Package className="w-4 h-4" />
              产品列表 ({products.length})
            </button>

          </div>
        </motion.div>

        {/* 产品列表 */}
        {activeTab === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6">
              {/* 搜索框 */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="搜索产品名称..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                  />
                </div>
              </div>

              {productsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">产品名称</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">用户上限</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">积分上限</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">关联租户</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">创建时间</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            {searchTerm ? '未找到匹配的产品' : '暂无产品数据'}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product, index) => (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                  <Package className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-slate-800">{product.name || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-slate-700 font-medium">
                                {product.userLimit != null ? product.userLimit.toLocaleString() : '不限'}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-slate-700 font-medium">
                                {product.creditLimit != null ? product.creditLimit.toLocaleString() : '不限'}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                                {product._count?.tenants ?? 0} 个租户
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
                              {new Date(product.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(product)}
                                  className="flex items-center gap-1 text-xs h-8 px-3 border-sky-200 text-sky-700 hover:bg-sky-50"
                                >
                                  <Edit className="w-3 h-3" />
                                  编辑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteModal(product)}
                                  className="flex items-center gap-1 text-xs h-8 px-3 border-red-200 text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  删除
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* 创建产品表单 */}
        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">创建新产品</h2>
                  <p className="text-sm text-slate-500">添加一个新的租户套餐产品</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-5 max-w-md">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="createName" className="text-sky-800 font-medium">
                      产品名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="createName"
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                      placeholder="请输入产品名称"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="createUserLimit" className="text-sky-800 font-medium">
                      用户上限 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="createUserLimit"
                      type="number"
                      min="0"
                      value={createUserLimit}
                      onChange={(e) => setCreateUserLimit(e.target.value)}
                      required
                      placeholder="留空表示不限制"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="createCreditLimit" className="text-sky-800 font-medium">
                      积分上限 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="createCreditLimit"
                      type="number"
                      min="0"
                      value={createCreditLimit}
                      onChange={(e) => setCreateCreditLimit(e.target.value)}
                      required
                      placeholder="留空表示不限制"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 font-medium"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      创建中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />
                      创建产品
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* 编辑弹窗 */}
        {editModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 id="edit-product-title" className="text-lg font-semibold text-slate-800">
                  编辑产品
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 font-medium">
                    产品名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="请输入产品名称"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">用户上限 <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    value={editUserLimit}
                    onChange={(e) => setEditUserLimit(e.target.value)}
                    placeholder="留空表示不限制"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">积分上限 <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(e.target.value)}
                    placeholder="留空表示不限制"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200"
                  onClick={() => setEditModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={handleEdit}
                  disabled={editLoading}
                >
                  {editLoading ? '保存中...' : '保存修改'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认弹窗 */}
        {deleteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h2 id="delete-product-title" className="text-lg font-semibold text-slate-800">
                  确认删除
                </h2>
              </div>

              <p className="text-slate-600 mb-2">
                确定要删除产品 <span className="font-medium text-slate-800">"{deleteName}"</span> 吗？
              </p>
              <p className="text-sm text-slate-500">
                此操作不可撤销。如果该产品下有租户正在使用，删除将失败。
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? '删除中...' : '确认删除'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
