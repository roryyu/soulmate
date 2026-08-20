'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building, Search, CheckCircle, AlertCircle, ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

// 租户类型定义
type Tenant = {
  id: string
  name: string
  productId: string
  productName: string
  userLimit: number
  creditLimit: number
  userCount: number
  createdAt: string
  updatedAt: string
}

// 产品类型定义
type TenantProduct = {
  id: string
  name: string
  userLimit: number
  creditLimit: number
}



export default function AdminTenantManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // 状态管理
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  
  // 创建租户表单状态
  const [tenantName, setTenantName] = useState('')
  const [productId, setProductId] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 编辑租户表单状态
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [editTenantName, setEditTenantName] = useState('')
  const [editProductId, setEditProductId] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  
  // 删除租户表单状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // 消息提示
  const [message, setMessage] = useState({ type: '', text: '' })

  // 获取租户列表
  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenant/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: searchTerm }),
      })
      if (response.ok) {
        const data = await response.json()
        setTenants(data.data || [])
      }
    } catch (error) {
      console.error('获取租户列表失败:', error)
      setMessage({ type: 'error', text: '获取租户列表失败' })
    } finally {
      setTenantsLoading(false)
    }
  }

  // 获取产品列表
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/tenant-product/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
      setMessage({ type: 'error', text: '获取产品列表失败' })
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

    // 检查是否是管理员
    if (session?.user?.role !== 'ADMIN') {
      router.push('/admin/prescription')
      return
    }

    fetchTenants()
    fetchProducts()
  }, [status, session, router])

  // 处理创建租户
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    // 表单验证
    if (!tenantName.trim()) {
      setMessage({ type: 'error', text: '请输入租户名称' })
      setIsLoading(false)
      return
    }

    if (!productId) {
      setMessage({ type: 'error', text: '请选择产品类型' })
      setIsLoading(false)
      return
    }

    if (!userName.trim()) {
      setMessage({ type: 'error', text: '请输入管理员姓名' })
      setIsLoading(false)
      return
    }

    if (!userEmail.trim()) {
      setMessage({ type: 'error', text: '请输入管理员邮箱' })
      setIsLoading(false)
      return
    }

    if (!userPhone.trim()) {
      setMessage({ type: 'error', text: '请输入管理员手机号' })
      setIsLoading(false)
      return
    }

    if (!userPassword.trim()) {
      setMessage({ type: 'error', text: '请输入管理员密码' })
      setIsLoading(false)
      return
    }

    if (!confirmPassword.trim()) {
      setMessage({ type: 'error', text: '请确认管理员密码' })
      setIsLoading(false)
      return
    }

    if (userPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' })
      setIsLoading(false)
      return
    }

    if (userPassword.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少为6个字符' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tenant/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tenantName,
          productId,
          userName,
          userEmail,
          userPhone,
          userPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '租户创建成功！' })
        // 清空表单
        setTenantName('')
        setProductId('')
        setUserName('')
        setUserEmail('')
        setUserPhone('')
        setUserPassword('')
        setConfirmPassword('')
        // 刷新租户列表
        fetchTenants()
      } else {
        setMessage({ type: 'error', text: data.error || '创建租户失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理编辑租户
  const handleEditTenant = async () => {
    if (!editingTenant) return
    setEditLoading(true)
    setMessage({ type: '', text: '' })

    // 表单验证
    if (!editTenantName.trim()) {
      setMessage({ type: 'error', text: '请输入租户名称' })
      setEditLoading(false)
      return
    }

    if (!editProductId) {
      setMessage({ type: 'error', text: '请选择产品类型' })
      setEditLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/tenant/edit/${editingTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTenantName,
          productId: editProductId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '租户信息更新成功！' })
        closeEditModal()
        // 刷新租户列表
        fetchTenants()
      } else {
        setMessage({ type: 'error', text: data.error || '更新租户信息失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setEditLoading(false)
    }
  }

  // 打开编辑模态框
  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setEditTenantName(tenant.name)
    setEditProductId(tenant.productId)
    setEditModalOpen(true)
  }

  // 关闭编辑模态框
  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingTenant(null)
    setEditLoading(false)
  }

  // 处理删除租户
  const handleDeleteTenant = async () => {
    if (!deletingTenant) return
    setDeleteLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch(`/api/tenant/delete/${deletingTenant.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '租户删除成功！' })
        closeDeleteModal()
        // 刷新租户列表
        fetchTenants()
      } else {
        setMessage({ type: 'error', text: data.error || '删除租户失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // 打开删除模态框
  const openDeleteModal = (tenant: Tenant) => {
    setDeletingTenant(tenant)
    setDeleteModalOpen(true)
  }

  // 关闭删除模态框
  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeletingTenant(null)
    setDeleteLoading(false)
  }

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setTenantsLoading(true)
    fetchTenants()
  }

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

      {/* 中文注释：管理端列表列数较多，适当放宽容器宽度，减少换行 */}
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
              <Building className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">租户管理</h1>
          </div>
          <p className="text-slate-500">管理平台租户，支持创建、编辑租户信息</p>
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
              创建租户
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'list'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-sky-100'
              }`}
            >
              <Building className="w-4 h-4" />
              租户列表 ({tenants.length})
            </button>
          </div>
        </motion.div>

        {/* 创建租户表单 */}
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
                  <h2 className="text-lg font-semibold text-slate-800">创建新租户</h2>
                  <p className="text-sm text-slate-500">为新租户创建平台账户</p>
                </div>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-5 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenantName" className="text-sky-800 font-medium">
                      租户名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="tenantName"
                      type="text"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      required
                      placeholder="请输入租户名称"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productId" className="text-sky-800 font-medium">
                      产品类型 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={productId}
                      onValueChange={setProductId}
                    >
                      <SelectTrigger className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all">
                        <SelectValue placeholder="请选择产品类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsLoading ? (
                          <SelectItem value="" disabled={true}>
                            加载中...
                          </SelectItem>
                        ) : products.length > 0 ? (
                          products.map((product) => (
                            <SelectItem 
                              key={product.id} 
                              value={product.id}
                              label={`${product.name} (用户限制: ${product.userLimit}, 积分限制: ${product.creditLimit})`}
                            >
                              {product.name} (用户限制: {product.userLimit}, 积分限制: {product.creditLimit})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled={true}>
                            暂无产品数据
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-md font-semibold text-slate-800 mb-4">租户管理员信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userName" className="text-sky-800 font-medium">
                        管理员姓名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="userName"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                        placeholder="请输入管理员姓名"
                        className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userEmail" className="text-sky-800 font-medium">
                        管理员邮箱 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        required
                        placeholder="请输入管理员邮箱"
                        className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userPhone" className="text-sky-800 font-medium">
                        管理员手机号 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="userPhone"
                        type="tel"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        required
                        placeholder="请输入管理员手机号"
                        className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-md font-semibold text-slate-800 mb-4">管理员密码</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userPassword" className="text-sky-800 font-medium">
                        初始密码 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="userPassword"
                        type="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        required
                        placeholder="请输入初始密码"
                        className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-sky-800 font-medium">
                        确认密码 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="请再次输入密码"
                        className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      创建中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Building className="w-5 h-5" />
                      创建租户
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* 租户列表 */}
        {activeTab === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6">
              {/* 搜索框 */}
              <div className="mb-6">
                <form onSubmit={handleSearch} className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="搜索租户名称..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                  />
                </form>
              </div>

              {tenantsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* 中文注释：设置表格最小宽度，避免列被挤到换行 */}
                  <table className="w-full min-w-[1080px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">租户名称</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">产品类型</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">用户限制</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">积分限制</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">当前用户数</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">创建时间</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-500">
                            {searchTerm ? '未找到匹配的租户' : '暂无租户数据'}
                          </td>
                        </tr>
                      ) : (
                        tenants.map((tenant, index) => (
                          <motion.tr
                            key={tenant.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                  {tenant.name[0].toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-800">{tenant.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{tenant.productName}</td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{tenant.userLimit}</td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{tenant.creditLimit}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tenant.userCount >= tenant.userLimit
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {tenant.userCount} / {tenant.userLimit}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
                              {new Date(tenant.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(tenant)}
                                  className="flex items-center gap-1 text-xs h-8 px-3 border-sky-200 text-sky-700 hover:bg-sky-50"
                                >
                                  <Edit className="w-3 h-3" />
                                  编辑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteModal(tenant)}
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

            {/* 编辑租户弹窗 */}
            {editModalOpen && editingTenant && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-edit-tenant-title"
              >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeEditModal} />
                <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
                  <h2 id="admin-edit-tenant-title" className="text-lg font-semibold text-slate-800">
                    编辑租户（{editingTenant.name}）
                  </h2>

                  <div className="mt-4 space-y-3">
                    <div>
                      <Label className="text-slate-700 font-medium">租户名称</Label>
                      <Input
                        value={editTenantName}
                        onChange={(e) => setEditTenantName(e.target.value)}
                        placeholder="请输入租户名称"
                        className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">产品类型</Label>
                      <Select
                        value={editProductId}
                        onValueChange={setEditProductId}
                      >
                        <SelectTrigger className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl">
                          <SelectValue placeholder="请选择产品类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {productsLoading ? (
                            <SelectItem value="" disabled>
                              加载中...
                            </SelectItem>
                          ) : products.length > 0 ? (
                            products.map((product) => (
                              <SelectItem 
                                key={product.id} 
                                value={product.id}
                                label={`${product.name} (用户限制: ${product.userLimit}, 积分限制: ${product.creditLimit})`}
                              >
                                {product.name} (用户限制: {product.userLimit}, 积分限制: {product.creditLimit})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              暂无产品数据
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" variant="outline" className="border-slate-200" onClick={closeEditModal}>
                      取消
                    </Button>
                    <Button
                      type="button"
                      className="bg-sky-600 hover:bg-sky-700 text-white"
                      onClick={handleEditTenant}
                      disabled={editLoading}
                    >
                      {editLoading ? '提交中...' : '保存更改'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 删除租户弹窗 */}
            {deleteModalOpen && deletingTenant && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-delete-tenant-title"
              >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDeleteModal} />
                <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
                  <h2 id="admin-delete-tenant-title" className="text-lg font-semibold text-slate-800">
                    删除租户（{deletingTenant.name}）
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    警告：此操作将永久删除该租户，且无法恢复。
                    {deletingTenant.userCount > 0 && (
                      <span className="block mt-2 text-red-600">
                        该租户下还有 {deletingTenant.userCount} 个用户，无法删除。
                      </span>
                    )}
                  </p>

                  <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" variant="outline" className="border-slate-200" onClick={closeDeleteModal}>
                      取消
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDeleteTenant}
                      disabled={deleteLoading || deletingTenant.userCount > 0}
                    >
                      {deleteLoading ? '删除中...' : '确认删除'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  )
}
