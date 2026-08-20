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
import {
  Shield,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'

// 权限选项
const permissionOptions = [
  { value: 'READ_ONLY', label: '只读' },
  { value: 'READ_WRITE', label: '读写' }
]

// 获取权限标签映射
const getPermissionLabel = (value: string | null) => {
  if (!value) return '-'
  const option = permissionOptions.find(opt => opt.value === value)
  return option ? option.label : value
}

type Role = {
  id: string
  name: string | null
  permission: string | null
  createdAt: string
  updatedAt: string
  usageCount: number
}

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

export default function AdminRoleManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 表单状态
  const [name, setName] = useState('')
  const [permission, setPermission] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // 列表状态
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')

  // 编辑弹窗状态
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editRoleId, setEditRoleId] = useState('')
  const [editName, setEditName] = useState('')
  const [editPermission, setEditPermission] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // 删除确认弹窗
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/role/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error('获取角色列表失败:', error)
    } finally {
      setRolesLoading(false)
    }
  }

  // 权限检查
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

    fetchRoles()
  }, [status, session, router])

  // 创建角色
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    if (!name.trim()) {
      setMessage({ type: 'error', text: '请输入角色名称' })
      setIsLoading(false)
      return
    }

    if (!permission) {
      setMessage({ type: 'error', text: '请选择权限' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/role/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), permission: permission.trim() || undefined }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '角色创建成功！' })
        setName('')
        setPermission('')
        fetchRoles()
      } else {
        setMessage({ type: 'error', text: data.error || '创建角色失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  // 打开编辑弹窗
  const openEditModal = (role: Role) => {
    setEditRoleId(role.id)
    setEditName(role.name || '')
    setEditPermission(role.permission || '')
    setEditModalOpen(true)
  }

  // 提交编辑
  const handleEditRole = async () => {
    if (!editName.trim()) {
      setMessage({ type: 'error', text: '请输入角色名称' })
      return
    }

    if (!editPermission) {
      setMessage({ type: 'error', text: '请选择权限' })
      return
    }

    setEditLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch(`/api/role/edit/${editRoleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), permission: editPermission.trim() || undefined }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '角色更新成功！' })
        closeEditModal()
        fetchRoles()
      } else {
        setMessage({ type: 'error', text: data.error || '更新角色失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setEditLoading(false)
    }
  }

  // 打开删除确认
  const openDeleteModal = (role: Role) => {
    setDeleteTarget(role)
    setDeleteModalOpen(true)
  }

  // 执行删除
  const handleDeleteRole = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch(`/api/role/delete/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '角色已删除' })
        closeDeleteModal()
        fetchRoles()
      } else {
        setMessage({ type: 'error', text: data.error || '删除角色失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditRoleId('')
    setEditName('')
    setEditPermission('')
    setEditLoading(false)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteTarget(null)
    setDeleteLoading(false)
  }

  // 过滤角色列表
  const filteredRoles = roles.filter(
    (role) =>
      role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.permission?.toLowerCase().includes(searchTerm.toLowerCase())
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

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">角色管理</h1>
          </div>
          <p className="text-slate-500">管理系统角色及其权限配置</p>
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
              创建角色
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'list'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-sky-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              角色列表 ({roles.length})
            </button>
          </div>
        </motion.div>

        {/* 创建角色表单 */}
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
                  <h2 className="text-lg font-semibold text-slate-800">创建新角色</h2>
                  <p className="text-sm text-slate-500">添加一个新的系统角色</p>
                </div>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-5 max-w-md">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roleName" className="text-sky-800 font-medium">
                      角色名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="roleName"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="例如：项目经理、研究员"
                      className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rolePermission" className="text-sky-800 font-medium">
                      权限描述 <span className="text-red-500">*</span>
                    </Label>
                    <Select value={permission} onValueChange={setPermission}>
                      <SelectTrigger
                        id="rolePermission"
                        className="mt-1.5 h-12 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                      >
                        <SelectValue placeholder="请选择权限" />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Plus className="w-5 h-5" />
                      创建角色
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* 角色列表 */}
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
                    placeholder="搜索角色名称或权限..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-sky-50 border-sky-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-all"
                  />
                </div>
              </div>

              {rolesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">角色名称</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">权限描述</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">使用人数</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">创建时间</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-500">
                            {searchTerm ? '未找到匹配的角色' : '暂无角色数据'}
                          </td>
                        </tr>
                      ) : (
                        filteredRoles.map((role, index) => (
                          <motion.tr
                            key={role.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                  <Shield className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-slate-800">{role.name || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {role.permission ? (
                                <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                                  {getPermissionLabel(role.permission)}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                role.usageCount > 0
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {role.usageCount} 人
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
                              {new Date(role.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(role)}
                                  className="flex items-center gap-1 text-xs h-8 px-3 border-sky-200 text-sky-700 hover:bg-sky-50"
                                >
                                  <Pencil className="w-3 h-3" />
                                  编辑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteModal(role)}
                                  className="flex items-center gap-1 text-xs h-8 px-3 border-red-200 text-red-600 hover:bg-red-50"
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

            {/* 编辑角色弹窗 */}
            {editModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-role-title"
              >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeEditModal} />
                <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 id="edit-role-title" className="text-lg font-semibold text-slate-800">
                      编辑角色
                    </h2>
                    <button
                      onClick={closeEditModal}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 font-medium">角色名称</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="请输入角色名称"
                        className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">
                        权限描述
                      </Label>
                      <Select value={editPermission} onValueChange={setEditPermission}>
                        <SelectTrigger className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl">
                          <SelectValue placeholder="请选择权限" />
                        </SelectTrigger>
                        <SelectContent>
                          {permissionOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200"
                      onClick={closeEditModal}
                    >
                      取消
                    </Button>
                    <Button
                      type="button"
                      className="bg-sky-600 hover:bg-sky-700 text-white"
                      onClick={handleEditRole}
                      disabled={editLoading}
                    >
                      {editLoading ? '保存中...' : '保存修改'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 删除确认弹窗 */}
            {deleteModalOpen && deleteTarget && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-role-title"
              >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDeleteModal} />
                <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
                  <h2 id="delete-role-title" className="text-lg font-semibold text-slate-800">
                    确认删除角色
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    确定要删除角色 <span className="font-medium text-slate-800">&ldquo;{deleteTarget.name}&rdquo;</span> 吗？
                  </p>
                  {deleteTarget.usageCount > 0 && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      该角色当前有 {deleteTarget.usageCount} 人使用，无法删除
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200"
                      onClick={closeDeleteModal}
                    >
                      取消
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDeleteRole}
                      disabled={deleteLoading || deleteTarget.usageCount > 0}
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
