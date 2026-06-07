'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Menu, X, ArrowLeft, Home } from 'lucide-react'

// 菜单项配置
const menuItems = [
  { name: '选题构思', href: 'ideation', label: 'Ideation' },
  { name: '文献检索', href: 'search', label: 'Search' },
  { name: '文献速读', href: 'reading', label: 'Reading' },
  { name: '文献综述', href: 'outlines', label: 'Outlines' },
  { name: '数字疗愈写作', href: 'writing', label: 'Writing' },
  { name: '数字疗愈润色', href: 'polishing', label: 'Polishing' },
]

// 项目信息类型
interface ProjectInfo {
  id: string
  title: string
  field?: string
  description?: string
}

// 创建项目上下文
interface ProjectContextType {
  projectInfo: ProjectInfo | null
  refreshProjectInfo: () => void
  projectTitleUpdated: number // 用于触发子组件更新的标志
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

// 从后端API获取项目信息
const fetchProjectInfo = async (projectId: string): Promise<ProjectInfo | null> => {
  try {
    const response = await fetch(`/api/research/projects/${projectId}`)
    if (!response.ok) {
      throw new Error('获取项目信息失败')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取项目信息错误:', error)
    return null
  }
}

// 自定义Hook，用于在子组件中使用项目上下文
export const useProjectContext = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [projectTitleUpdated, setProjectTitleUpdated] = useState(0) // 课题标题更新标志
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // 获取项目信息
  useEffect(() => {
    const loadProjectInfo = async () => {
      const info = await fetchProjectInfo(projectId)
      setProjectInfo(info)
    }
    loadProjectInfo()
  }, [projectId, refreshKey])

  // 提供给子组件的刷新方法
  const refreshProjectInfo = () => {
    setRefreshKey(prev => prev + 1)
  }

  // 更新项目名称
  const updateProjectTitle = async (newTitle: string) => {
    try {
      const response = await fetch(`/api/research/projects/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })
      
      if (!response.ok) {
        throw new Error('更新项目名称失败')
      }
      
      const updatedProject = await response.json()
      setProjectInfo(updatedProject)
      setEditingTitle(false)
      // 触发课题标题更新标志，通知子组件
      setProjectTitleUpdated(prev => prev + 1)
    } catch (error) {
      console.error('更新项目名称错误:', error)
    }
  }

  // 处理编辑开始
  const handleEditStart = () => {
    setNewTitle(projectInfo?.title || '')
    setEditingTitle(true)
  }

  // 处理编辑取消
  const handleEditCancel = () => {
    setEditingTitle(false)
  }

  // 处理编辑提交
  const handleEditSubmit = () => {
    if (newTitle.trim()) {
      updateProjectTitle(newTitle.trim())
    }
  }

  // 处理回车键提交
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  // 判断当前激活的菜单项
  const getActiveMenu = () => {
    const currentPath = pathname.split('/').pop()
    return currentPath || 'ideation'
  }

  const activeMenu = getActiveMenu()
  const projectName = projectInfo?.title || `课题 ${projectId}`

  return (
    <ProjectContext.Provider value={{ projectInfo, refreshProjectInfo, projectTitleUpdated }}>
      <div className="flex h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
        {/* 移动端遮罩层 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 侧边栏 */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30
            w-64 bg-white/80 backdrop-blur-xl border-r border-teal-100
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            flex flex-col shadow-soft
          `}
        >
          {/* 侧边栏头部 */}
          <div className="p-5 border-b border-teal-100">
            {/* 返回按钮区域 - 移到最上面 */}
            <div className="flex flex-col gap-1 mb-4">
              <Link
                href="/admin/prescription"
                className="flex items-center gap-2.5 px-2 py-2 text-sm text-teal-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all duration-200 group"
              >
                <Home size={14} className="transition-transform group-hover:-translate-x-0.5" />
                <span>应用首页</span>
              </Link>
            </div>

            {/* 分隔线 */}
            <div className="my-3 h-px bg-gradient-to-r from-teal-100 via-teal-200 to-transparent" />

            {/* 课题名称 */}
            <div className="px-2 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3 bg-gradient-to-b from-teal-400 to-teal-500 rounded-full" />
                <span className="text-xs font-medium text-teal-500 uppercase tracking-widest">
                  当前课题
                </span>
              </div>
              {editingTitle ? (
                <div className="relative">
                  <textarea
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    rows={3}
                    className="w-full px-3 py-2 text-[15px] font-medium text-teal-800 leading-relaxed bg-teal-50 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleEditSubmit}
                      className="px-3 py-1 text-xs font-medium text-white bg-teal-500 rounded-md hover:bg-teal-600 transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1 text-xs font-medium text-teal-600 bg-teal-50 rounded-md hover:bg-teal-100 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-medium text-teal-800 leading-relaxed break-words whitespace-normal">
                    {projectName}
                  </p>
                  <button
                    onClick={handleEditStart}
                    className="p-1.5 text-teal-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors flex-shrink-0"
                    aria-label="编辑项目名称"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 菜单列表 */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="relative">
              {/* 垂直进度线 */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-teal-100 rounded-full" />

              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = activeMenu === item.href
                  return (
                    <li key={item.href} className="relative">
                      <Link
                        href={`/research/${projectId}/${item.href}`}
                        className={`
                          group flex items-center gap-4 py-3 px-3 rounded-xl
                          transition-all duration-300 ease-out
                          ${
                            isActive
                              ? 'bg-gradient-to-r from-teal-500/10 to-teal-400/5'
                              : 'hover:bg-teal-50'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {/* 序号圆点 */}
                        <div className="relative z-10 flex-shrink-0">
                          <div
                            className={`
                              w-3.5 h-3.5 rounded-full border-2
                              transition-all duration-300
                              ${
                                isActive
                                  ? 'bg-teal-500 border-teal-500 scale-110 shadow-md shadow-teal-400/30'
                                  : 'bg-white border-teal-200 group-hover:border-teal-400'
                              }
                            `}
                          />
                        </div>

                        {/* 文字内容 */}
                        <div className="flex flex-col">
                          <span
                            className={`
                              text-sm font-medium tracking-wide
                              transition-colors duration-200
                              ${
                                isActive
                                  ? 'text-teal-800'
                                  : 'text-teal-600 group-hover:text-teal-800'
                              }
                            `}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`
                              text-xs tracking-wider uppercase
                              transition-colors duration-200
                              ${
                                isActive
                                  ? 'text-teal-500'
                                  : 'text-teal-300 group-hover:text-teal-500'
                              }
                            `}
                          >
                            {item.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          {/* 侧边栏底部 */}
          <div className="p-4 border-t border-teal-100">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-teal-200" />
              <span className="text-[11px] text-teal-400 tracking-widest uppercase">
                Soulmate v1.0
              </span>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-teal-200" />
            </div>
          </div>
        </aside>

        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 移动端顶部栏 */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-teal-100">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-teal-50 rounded-xl transition-colors"
              aria-label="打开菜单"
            >
              <Menu size={24} className="text-teal-800" />
            </button>
            <span className="text-sm font-medium text-teal-800 truncate">
              {projectName}
            </span>
            <div className="w-10" /> {/* 占位保持居中 */}
          </header>

          {/* 内容区域 */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>

        {/* 移动端关闭按钮（当侧边栏打开时显示） */}
        <button
          className="lg:hidden fixed top-4 right-4 z-40 p-2 bg-white rounded-xl shadow-lg hover:bg-teal-50 transition-colors"
          onClick={() => setSidebarOpen(false)}
          style={{ display: sidebarOpen ? 'block' : 'none' }}
          aria-label="关闭菜单"
        >
          <X size={24} className="text-teal-800" />
        </button>
      </div>
    </ProjectContext.Provider>
  )
}
