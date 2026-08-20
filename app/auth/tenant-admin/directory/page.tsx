'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Folder,
  Plus,
  ChevronRight,
  ChevronDown,
  Users,
  FileText,
  Eye,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  MoreVertical,
  X,
  Upload
} from 'lucide-react'
import Link from 'next/link'

// 类型定义
type DirectoryNode = {
  id: string
  name: string | null
  parentId: string | null
  description: string | null
  tenantId: string | null
  createdAt: Date
  updatedAt: Date
  docCount: number
  children?: DirectoryNode[]
}

type UserRole = {
  id: string
  directoryId: string
  userId: string
  roleId: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
  role: {
    id: string
    name: string | null
  }
}

type Document = {
  id: string
  fileName: string | null
  fileType: string | null
  content: string | null
  fileData: string | null
  status: string
  directoryId: string | null
  createdAt: Date
  updatedAt: Date
}

type User = {
  id: string
  name: string | null
  email: string
}

type Role = {
  id: string
  name: string | null
}

// 动画配置
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 }
}

export default function TenantDirectoryManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 状态管理
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode[]>([])
  const [selectedDirectory, setSelectedDirectory] = useState<DirectoryNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // 弹窗状态
  const [addDirectoryModalOpen, setAddDirectoryModalOpen] = useState(false)
  const [editDirectoryModalOpen, setEditDirectoryModalOpen] = useState(false)
  const [deleteDirectoryModalOpen, setDeleteDirectoryModalOpen] = useState(false)
  const [addUserRoleModalOpen, setAddUserRoleModalOpen] = useState(false)
  const [deleteUserRoleModalOpen, setDeleteUserRoleModalOpen] = useState(false)
  const [documentPreviewModalOpen, setDocumentPreviewModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  // 上传相关状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // 表单状态
  const [directoryForm, setDirectoryForm] = useState({ name: '', description: '', parentId: null as string | null })
  const [userRoleForm, setUserRoleForm] = useState({ userIds: [] as string[], roleId: '' })
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [userRoleToDelete, setUserRoleToDelete] = useState<UserRole | null>(null)
  const [directoryToDelete, setDirectoryToDelete] = useState<DirectoryNode | null>(null)
  
  const [formLoading, setFormLoading] = useState(false)

  // 获取目录树
  const fetchDirectoryTree = async () => {
    try {
      const response = await fetch('/api/directory/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeView: true }),
      })
      if (response.ok) {
        const data = await response.json()
        setDirectoryTree(data.directories || [])
      }
    } catch (error) {
      console.error('获取目录树失败:', error)
    }
  }

  // 获取用户角色
  const fetchUserRoles = async (directoryId: string) => {
    try {
      const response = await fetch('/api/directory/find-user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directoryId }),
      })
      if (response.ok) {
        const data = await response.json()
        setUserRoles(data.userRoles || [])
      }
    } catch (error) {
      console.error('获取用户角色失败:', error)
    }
  }

  // 获取文档
  const fetchDocuments = async (directoryId: string) => {
    try {
      const response = await fetch('/api/directory/find-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directoryId }),
      })
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('获取文档失败:', error)
    }
  }

  // 获取租户用户
  const fetchTenantUsers = async () => {
    try {
      const response = await fetch('/api/tenant-admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('获取租户用户失败:', error)
    }
  }

  // 获取角色
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/tenant-admin/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error('获取角色失败:', error)
    }
  }

  // 初始化
  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.role !== 'TENANTADMIN') {
      router.push('/admin/prescription')
      return
    }

    Promise.all([fetchDirectoryTree(), fetchTenantUsers(), fetchRoles()])
      .finally(() => setLoading(false))
  }, [status, session, router])

  // 选择目录时加载数据
  useEffect(() => {
    if (selectedDirectory) {
      Promise.all([
        fetchUserRoles(selectedDirectory.id),
        fetchDocuments(selectedDirectory.id)
      ])
    }
  }, [selectedDirectory])

  // 切换目录展开
  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // 渲染目录树节点
  const renderDirectoryNode = (node: DirectoryNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedDirectory?.id === node.id
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
            isSelected 
              ? 'bg-sky-100 text-sky-700' 
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => setSelectedDirectory(node)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          <Folder className="w-4 h-4" />
          <span className="flex-1 text-sm font-medium truncate">{node.name || '未命名'}</span>
          <span className="text-xs text-slate-400">({node.docCount})</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              openAddDirectoryModal(node.id)
            }}
            className="p-1 hover:bg-slate-200 rounded-md text-slate-500 hover:text-sky-600"
          >
            <Plus className="w-3 h-3" />
          </button>
        </motion.div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderDirectoryNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // 打开添加目录弹窗
  const openAddDirectoryModal = (parentId: string | null = null) => {
    setDirectoryForm({ name: '', description: '', parentId })
    setAddDirectoryModalOpen(true)
  }

  // 打开编辑目录弹窗
  const openEditDirectoryModal = () => {
    if (!selectedDirectory) return
    setDirectoryForm({
      name: selectedDirectory.name || '',
      description: selectedDirectory.description || '',
      parentId: selectedDirectory.parentId
    })
    setEditDirectoryModalOpen(true)
  }

  // 打开删除目录弹窗
  const openDeleteDirectoryModal = () => {
    if (!selectedDirectory) return
    setDirectoryToDelete(selectedDirectory)
    setDeleteDirectoryModalOpen(true)
  }

  // 添加目录
  const handleAddDirectory = async () => {
    if (!directoryForm.name.trim()) {
      setMessage({ type: 'error', text: '目录名称不能为空' })
      return
    }
    setFormLoading(true)
    try {
      const response = await fetch('/api/directory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directoryForm),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: '目录添加成功' })
        setAddDirectoryModalOpen(false)
        fetchDirectoryTree()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '添加目录失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误' })
    } finally {
      setFormLoading(false)
    }
  }

  // 编辑目录
  const handleEditDirectory = async () => {
    if (!selectedDirectory || !directoryForm.name.trim()) {
      setMessage({ type: 'error', text: '目录名称不能为空' })
      return
    }
    setFormLoading(true)
    try {
      const response = await fetch(`/api/directory/edit/${selectedDirectory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directoryForm),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: '目录更新成功' })
        setEditDirectoryModalOpen(false)
        fetchDirectoryTree()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '更新目录失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误' })
    } finally {
      setFormLoading(false)
    }
  }

  // 删除目录
  const handleDeleteDirectory = async () => {
    if (!directoryToDelete) return
    setFormLoading(true)
    try {
      const response = await fetch(`/api/directory/delete/${directoryToDelete.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setMessage({ type: 'success', text: '目录删除成功' })
        setDeleteDirectoryModalOpen(false)
        setSelectedDirectory(null)
        fetchDirectoryTree()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '删除目录失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误' })
    } finally {
      setFormLoading(false)
    }
  }

  // 打开添加用户角色弹窗
  const openAddUserRoleModal = () => {
    if (!selectedDirectory) return
    setUserRoleForm({ userIds: [], roleId: '' })
    setAddUserRoleModalOpen(true)
  }

  // 打开删除用户角色弹窗
  const openDeleteUserRoleModal = (userRole: UserRole) => {
    setUserRoleToDelete(userRole)
    setDeleteUserRoleModalOpen(true)
  }

  // 添加用户角色
  const handleAddUserRole = async () => {
    if (!selectedDirectory || userRoleForm.userIds.length === 0 || !userRoleForm.roleId) {
      setMessage({ type: 'error', text: '请选择用户和角色' })
      return
    }
    setFormLoading(true)
    try {
      const response = await fetch('/api/directory/add-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directoryId: selectedDirectory.id,
          roleId: userRoleForm.roleId,
          userIds: userRoleForm.userIds
        }),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: '用户角色添加成功' })
        setAddUserRoleModalOpen(false)
        fetchUserRoles(selectedDirectory.id)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '添加用户角色失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误' })
    } finally {
      setFormLoading(false)
    }
  }

  // 删除用户角色
  const handleDeleteUserRole = async () => {
    if (!userRoleToDelete || !selectedDirectory) return
    setFormLoading(true)
    try {
      const response = await fetch('/api/directory/delete-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directoryId: selectedDirectory.id,
          userIds: [userRoleToDelete.userId]
        }),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: '用户角色删除成功' })
        setDeleteUserRoleModalOpen(false)
        fetchUserRoles(selectedDirectory.id)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '删除用户角色失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误' })
    } finally {
      setFormLoading(false)
    }
  }

  // 打开文档预览
  const openDocumentPreview = (doc: Document) => {
    setPreviewDocument(doc)
    setDocumentPreviewModalOpen(true)
  }

  const openUploadModal = () => {
    setSelectedFiles([])
    setUploadModalOpen(true)
  }

  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(
      (file) => file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx')
    )
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const handleUpload = async () => {
    if (!selectedDirectory || selectedFiles.length === 0) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('directoryId', selectedDirectory.id)

      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/directory/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '文档上传成功' })
        setUploadModalOpen(false)
        setSelectedFiles([])
        // 刷新文档列表
        await fetchDocuments(selectedDirectory.id)
        // 刷新目录树
        await fetchDirectoryTree()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '上传失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误' })
    } finally {
      setIsUploading(false)
    }
  }

  const closeModals = () => {
    setAddDirectoryModalOpen(false)
    setEditDirectoryModalOpen(false)
    setDeleteDirectoryModalOpen(false)
    setAddUserRoleModalOpen(false)
    setDeleteUserRoleModalOpen(false)
    setDocumentPreviewModalOpen(false)
    setUploadModalOpen(false)
  }

  if (status === 'loading' || loading) {
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
            href="/auth/tenant-admin/dashboard"
            className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回控制台
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
              <Folder className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">知识库目录管理</h1>
          </div>
          <p className="text-slate-500">管理租户的知识库目录结构和权限配置</p>
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

        {/* 主内容区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* 左侧目录树 */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">目录结构</h3>
                <Button
                  size="sm"
                  onClick={() => openAddDirectoryModal(null)}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  根目录
                </Button>
              </div>
              <div className="p-3 max-h-[600px] overflow-y-auto">
                {directoryTree.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Folder className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">暂无目录</p>
                    <p className="text-xs text-slate-400 mt-1">点击上方按钮创建根目录</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {directoryTree.map((node) => renderDirectoryNode(node))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* 右侧内容区 */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDirectory ? (
              <>
                {/* 目录信息 */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                        <Folder className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-800">{selectedDirectory.name || '未命名'}</h2>
                        <p className="text-sm text-slate-500">{selectedDirectory.description || '暂无描述'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openEditDirectoryModal}
                        className="border-slate-200"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openDeleteDirectoryModal}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm text-slate-500">
                    <div>创建时间：{new Date(selectedDirectory.createdAt).toLocaleDateString('zh-CN')}</div>
                    <div>文档数量：{selectedDirectory.docCount}</div>
                  </div>
                </Card>

                {/* 用户权限表格 */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      目录权限
                    </h3>
                    <Button
                      size="sm"
                      onClick={openAddUserRoleModal}
                      className="bg-sky-500 hover:bg-sky-600 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      添加用户
                    </Button>
                  </div>
                  <div className="p-4">
                    {userRoles.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">暂无用户权限配置</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">用户</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">邮箱</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">角色</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userRoles.map((userRole, index) => (
                              <motion.tr
                                key={userRole.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                      {(userRole.user.name || userRole.user.email)[0].toUpperCase()}
                                    </div>
                                    <span className="font-medium text-slate-800">{userRole.user.name || '-'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-600">{userRole.user.email}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                                    {userRole.role.name || '-'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteUserRoleModal(userRole)}
                                    className="text-xs h-7 px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    删除
                                  </Button>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 文档列表 */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      文档列表
                    </h3>
                    <Button
                      size="sm"
                      onClick={openUploadModal}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      上传文档
                    </Button>
                  </div>
                  <div className="p-4">
                    {documents.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">暂无文档</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc, index) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-sky-50/50 transition-colors border border-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{doc.fileName || '未命名'}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocumentPreview(doc)}
                              className="text-xs h-7 px-2"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              预览
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-12">
                <div className="text-center">
                  <Folder className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">请选择一个目录</h3>
                  <p className="text-slate-500">从左侧目录树中选择一个目录查看详细信息</p>
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      </div>

      {/* 添加目录弹窗 */}
      {addDirectoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">
              {directoryForm.parentId ? '添加子目录' : '添加根目录'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {directoryForm.parentId ? '为当前目录添加子目录' : '创建新的根目录'}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-slate-700 font-medium">目录名称 *</Label>
                <Input
                  value={directoryForm.name}
                  onChange={(e) => setDirectoryForm({ ...directoryForm, name: e.target.value })}
                  placeholder="请输入目录名称"
                  className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium">描述</Label>
                <Input
                  value={directoryForm.description}
                  onChange={(e) => setDirectoryForm({ ...directoryForm, description: e.target.value })}
                  placeholder="请输入目录描述（可选）"
                  className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="border-slate-200" onClick={closeModals}>
                取消
              </Button>
              <Button
                type="button"
                className="bg-sky-500 hover:bg-sky-600 text-white"
                onClick={handleAddDirectory}
                disabled={formLoading}
              >
                {formLoading ? '添加中...' : '确认添加'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑目录弹窗 */}
      {editDirectoryModalOpen && selectedDirectory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">编辑目录</h2>
            <p className="mt-2 text-sm text-slate-600">修改目录信息</p>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-slate-700 font-medium">目录名称 *</Label>
                <Input
                  value={directoryForm.name}
                  onChange={(e) => setDirectoryForm({ ...directoryForm, name: e.target.value })}
                  placeholder="请输入目录名称"
                  className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium">描述</Label>
                <Input
                  value={directoryForm.description}
                  onChange={(e) => setDirectoryForm({ ...directoryForm, description: e.target.value })}
                  placeholder="请输入目录描述（可选）"
                  className="mt-1.5 h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="border-slate-200" onClick={closeModals}>
                取消
              </Button>
              <Button
                type="button"
                className="bg-sky-500 hover:bg-sky-600 text-white"
                onClick={handleEditDirectory}
                disabled={formLoading}
              >
                {formLoading ? '保存中...' : '确认保存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除目录弹窗 */}
      {deleteDirectoryModalOpen && directoryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">确认删除目录</h2>
            <p className="mt-2 text-sm text-slate-600">
              您确定要删除目录 "<span className="font-medium">{directoryToDelete.name}</span>" 吗？
              <br />
              <span className="text-red-500">
                此操作将同时删除所有子目录和文档，且无法恢复。
              </span>
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="border-slate-200" onClick={closeModals}>
                取消
              </Button>
              <Button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDeleteDirectory}
                disabled={formLoading}
              >
                {formLoading ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 添加用户角色弹窗 */}
      {addUserRoleModalOpen && selectedDirectory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">添加用户权限</h2>
            <p className="mt-2 text-sm text-slate-600">为目录添加用户和角色</p>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-slate-700 font-medium">选择用户 *</Label>
                <div className="mt-1.5 border border-slate-200 rounded-xl bg-slate-50 p-3 max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">暂无用户</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <label key={user.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={userRoleForm.userIds.includes(user.id)}
                            onChange={(e) => {
                              const newUserIds = e.target.checked
                                ? [...userRoleForm.userIds, user.id]
                                : userRoleForm.userIds.filter(id => id !== user.id)
                              setUserRoleForm({ ...userRoleForm, userIds: newUserIds })
                            }}
                            className="rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                          />
                          <div>
                            <p className="font-medium text-slate-800">{user.name || '-'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-slate-700 font-medium">选择角色 *</Label>
                <select
                  value={userRoleForm.roleId}
                  onChange={(e) => setUserRoleForm({ ...userRoleForm, roleId: e.target.value })}
                  className="mt-1.5 w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="">请选择角色</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="border-slate-200" onClick={closeModals}>
                取消
              </Button>
              <Button
                type="button"
                className="bg-sky-500 hover:bg-sky-600 text-white"
                onClick={handleAddUserRole}
                disabled={formLoading}
              >
                {formLoading ? '添加中...' : '确认添加'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除用户角色弹窗 */}
      {deleteUserRoleModalOpen && userRoleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">确认删除用户权限</h2>
            <p className="mt-2 text-sm text-slate-600">
              您确定要删除用户 "<span className="font-medium">{userRoleToDelete.user.name || userRoleToDelete.user.email}</span>" 的权限吗？
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="border-slate-200" onClick={closeModals}>
                取消
              </Button>
              <Button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDeleteUserRole}
                disabled={formLoading}
              >
                {formLoading ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 文档预览弹窗 */}
      {documentPreviewModalOpen && previewDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-200/80 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{previewDocument.fileName || '文档预览'}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={closeModals}
                className="border-slate-200"
              >
                关闭
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {previewDocument.fileData ? (
                <iframe
                  src={`/api/directory/documents/${previewDocument.id}/preview`}
                  className="w-full h-full border rounded-lg"
                  title={previewDocument.fileName || '文档预览'}
                />
              ) : previewDocument.content ? (
                <div className="prose prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border">
                    {previewDocument.content}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>文档内容暂不可用</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 上传文档弹窗 */}
      {uploadModalOpen && selectedDirectory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">上传文档</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModals}
              >
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-6">
              {/* 当前目录信息 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Folder size={16} />
                  <span>当前目录: {selectedDirectory.name}</span>
                </div>
              </div>

              {/* 文件选择 */}
              <div>
                <Label className="text-slate-700 font-medium">选择文件</Label>
                <div className="mt-2">
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-800">{file.name}</p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFiles = [...selectedFiles]
                              newFiles.splice(index, 1)
                              setSelectedFiles(newFiles)
                            }}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        multiple
                        onChange={handleModalFileSelect}
                        className="hidden"
                        id="file-input-modal"
                      />
                      <label
                        htmlFor="file-input-modal"
                        className="cursor-pointer"
                      >
                        <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                        <p className="text-slate-600">点击选择文件</p>
                        <p className="text-xs text-slate-400">
                          支持 PDF、DOCX 格式
                        </p>
                      </label>
                    </div>
                  )}
                  {selectedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const input = document.getElementById('file-input-modal') as HTMLInputElement
                        input?.click()
                      }}
                    >
                      <Plus size={16} className="mr-2" />
                      添加更多文件
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={closeModals}
              >
                取消
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? (
                  '上传中...'
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    确认上传
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
