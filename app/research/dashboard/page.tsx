'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  Lightbulb, 
  Layers, 
  FileText, 
  Database,
  Zap,
  GraduationCap,
  Users,
  Building2,
  ChevronDown,
  Settings,
  User,
  MessageSquare,
  LogOut,
  Crown,
  Coins,
  CreditCard,
  Receipt,
  LayoutDashboard,
  Sliders,
  ClipboardList,
} from 'lucide-react'
import { ImpersonationBanner } from '@/components/auth/ImpersonationBanner'

// 动画配置
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 }
}

const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
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

// 发光球体组件
function GlowingOrb({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-48 h-48 md:w-64 md:h-64 ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(56, 189, 248, 0) 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(14, 165, 233, 0.2) 50%, rgba(56, 189, 248, 0) 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute inset-8 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(186, 230, 253, 0.8), rgba(56, 189, 248, 0.6))',
          boxShadow: '0 0 60px rgba(56, 189, 248, 0.5), inset 0 0 40px rgba(255, 255, 255, 0.3)',
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

// 快捷操作入口组件
function QuickActions() {
  const actions = [
    {
      icon: Lightbulb,
      title: '选题构思',
      subtitle: 'IDEATION',
      desc: '输入教学感悟，AI 自动生成标准选题',
      color: 'from-amber-400 to-orange-500',
      href: '/research'
    },
    {
      icon: Search,
      title: '文献检索',
      subtitle: 'SEARCH',
      desc: '智能检索相关文献，提供研究参考',
      color: 'from-sky-400 to-blue-500',
      href: '/research'
    },
    {
      icon: FileText,
      title: '文献速读',
      subtitle: 'READING',
      desc: '快速阅读文献，提取核心观点',
      color: 'from-emerald-400 to-teal-500',
      href: '/research'
    },
    {
      icon: Layers,
      title: '文献综述',
      subtitle: 'OUTLINES',
      desc: '自动生成文献综述与大纲框架',
      color: 'from-violet-400 to-purple-500',
      href: '/research'
    },
    {
      icon: Database,
      title: '数字疗愈写作',
      subtitle: 'WRITING',
      desc: '辅助撰写论文，提供结构建议',
      color: 'from-pink-400 to-rose-500',
      href: '/research'
    },
    {
      icon: Sparkles,
      title: '数字疗愈润色',
      subtitle: 'POLISHING',
      desc: '智能润色优化，提升论文质量',
      color: 'from-cyan-400 to-sky-500',
      href: '/research'
    },
  ]

  return (
    <section className="py-8 bg-white rounded-3xl shadow-sm border border-slate-100 mb-8">
      <div className="px-6">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6"
        >
          {actions.map((action, index) => (
            <motion.div
              key={action.title}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="block bg-slate-50 hover:bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
            >
              <motion.div 
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg`}
                whileHover={{ rotate: 5, scale: 1.1 }}
              >
                <action.icon className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {action.subtitle}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {action.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// 类型定义
type ResearchProject = {
  id: string
  userId: string
  title: string
  field: string
  description: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  _count?: {
    ideas: number
    searches: number
    references: number
  }
}

// API 调用函数
async function fetchProjects(userId: string): Promise<ResearchProject[]> {
  const res = await fetch(`/api/research/projects?userId=${userId}`)
  if (!res.ok) throw new Error('获取课题列表失败')
  return res.json()
}

async function createProject(userId: string, data: {
  title: string
  field?: string
  description?: string
}): Promise<ResearchProject> {
  const res = await fetch('/api/research/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data }),
  })
  if (!res.ok) throw new Error('创建课题失败')
  return res.json()
}

export default function ResearchDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<ResearchProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 顶部导航：展示与套餐页一致的状态（剩余会员天数 + 积分余额）
  const [walletReady, setWalletReady] = useState(false)
  const [headerMembership, setHeaderMembership] = useState<{
    remainingDays: number
    productName: string | null
  } | null>(null)
  const [headerCredits, setHeaderCredits] = useState(0)

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 拉取会员与积分，用于顶栏展示（与 /payment 页状态栏信息对齐）
  useEffect(() => {
    if (status !== 'authenticated') {
      setWalletReady(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          fetch('/api/user/membership'),
          fetch('/api/user/credits'),
        ])
        if (cancelled) return
        if (mRes.ok) {
          const data = await mRes.json()
          const m = data.membership as
            | { remainingDays: number; product: { name: string } | null }
            | null
            | undefined
          setHeaderMembership(
            m
              ? {
                  remainingDays: m.remainingDays,
                  productName: m.product?.name ?? null,
                }
              : null
          )
        } else {
          setHeaderMembership(null)
        }
        if (cRes.ok) {
          const data = await cRes.json()
          setHeaderCredits(typeof data.balance === 'number' ? data.balance : 0)
        }
      } catch {
        if (!cancelled) {
          setHeaderMembership(null)
        }
      } finally {
        if (!cancelled) setWalletReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  // Form state - 已有明确选题
  const [clearTitleForm, setClearTitleForm] = useState({
    title: '',
  })
  const [clearTitleErrors, setClearTitleErrors] = useState<Record<string, string>>({})

  // Form state - 需要构思选题
  const [ideationForm, setIdeationForm] = useState({
    description: '',
  })
  const [ideationErrors, setIdeationErrors] = useState<Record<string, string>>({})

  // 加载课题列表：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchProjects(session!.user!.id!)
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  // Fetch projects on mount
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadProjects()
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [status, session?.user?.id, loadProjects])

  // 验证"已有明确选题"表单
  const validateClearTitleForm = () => {
    const newErrors: Record<string, string> = {}
    if (!clearTitleForm.title.trim()) {
      newErrors.title = '请输入您的选题'
    }
    setClearTitleErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 验证"需要构思选题"表单
  const validateIdeationForm = () => {
    const newErrors: Record<string, string> = {}
    setIdeationErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理"已有明确选题"提交 - 跳转到文献检索
  const handleClearTitleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateClearTitleForm()) return

    setIsSubmitting(true)
    try {
      const newProject = await createProject(session!.user!.id!, {
        title: clearTitleForm.title.trim(),
      })

      setProjects([newProject, ...projects])
      setIsDialogOpen(false)
      setClearTitleForm({ title: '' })
      setClearTitleErrors({})

      // 跳转到文献检索页面
      router.push(`/research/${newProject.id}/search`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理"需要构思选题"提交 - 跳转到选题构思
  const handleIdeationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateIdeationForm()) return

    setIsSubmitting(true)
    try {
      const newProject = await createProject(session!.user!.id!, {
        title: '未命名课题',
        description: ideationForm.description.trim() || undefined,
      })

      setProjects([newProject, ...projects])
      setIsDialogOpen(false)
      setIdeationForm({ description: '' })
      setIdeationErrors({})

      // 跳转到选题构思页面
      router.push(`/research/${newProject.id}/ideation`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 更新"已有明确选题"表单
  const updateClearTitleForm = (field: string, value: string) => {
    setClearTitleForm(prev => ({ ...prev, [field]: value }))
    if (clearTitleErrors[field]) {
      setClearTitleErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 更新"需要构思选题"表单
  const updateIdeationForm = (field: string, value: string) => {
    setIdeationForm(prev => ({ ...prev, [field]: value }))
    if (ideationErrors[field]) {
      setIdeationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-teal-600">请先登录后再访问此页面</p>
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

      {/* 模拟登录横幅 */}
      <ImpersonationBanner />

      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {/* 使用 next/image 优化 LCP（替代 img） */}
              <Image src="/logo.jpg" alt="Soulmate" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Soulmate</h1>
                <p className="text-xs text-slate-500">数字疗愈全流程管理</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-3" >
              {/* 会员与充值入口：展示剩余天数与积分（与套餐页顶部状态栏一致） */}
              <Link
                style={{ display: 'none' }}
                href="/payment"
                className="hidden sm:inline-flex items-stretch rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 shadow-sm text-sm font-medium transition-colors overflow-hidden"
              >
                {!walletReady ? (
                  <span className="inline-flex items-center px-3 py-1.5 text-amber-700">
                    <Crown className="w-4 h-4 mr-1.5 shrink-0" />
                    会员 · 积分
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-teal-700 whitespace-nowrap">
                      <Crown className="w-4 h-4 shrink-0" />
                      {headerMembership
                        ? `${headerMembership.productName ?? '会员'} · 剩余 ${headerMembership.remainingDays} 天`
                        : '暂无会员'}
                    </span>
                    <span className="w-px bg-slate-200/90 self-stretch min-h-[2.25rem]" aria-hidden />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-700 whitespace-nowrap">
                      <Coins className="w-4 h-4 shrink-0" />
                      {headerCredits.toLocaleString()} 积分
                    </span>
                  </>
                )}
              </Link>
              <Button
                onClick={() => setIsDialogOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                新建处方
              </Button>
              
              {/* 用户头像下拉框 */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  {/* 头像 */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                    {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 下拉菜单 */}
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
                  >
                    {/* 用户信息头部 */}
                    <div className="px-4 py-3 bg-gradient-to-r from-sky-50 to-sky-100 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-700">{session?.user?.name || '用户'}</p>
                      <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                    </div>

                    {/* 菜单项 */}
                    <div className="py-2">
                      <Link
                        style={{ display: 'none' }}
                        href="/dashboard/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-4 h-4 text-sky-600" />
                        </div>
                        账户设置
                      </Link>

                      <Link
                        style={{ display: 'none' }}
                        href="/dashboard/membership"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                      >
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Crown className="w-4 h-4 text-amber-600" />
                        </div>
                        会员与积分
                      </Link>
                      <Link
                        style={{ display: 'none' }}
                        href="/payment"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                      >
                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-violet-600" />
                        </div>
                        套餐与充值
                      </Link>
                      <Link
                        style={{ display: 'none' }}
                        href="/dashboard/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-slate-600" />
                        </div>
                        我的订单
                      </Link>

                      {/* 我的反馈入口 */}
                      <Link
                        style={{ display: 'none' }}
                        href="/dashboard/feedback"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <ClipboardList className="w-4 h-4 text-emerald-600" />
                        </div>
                        我的反馈
                      </Link>

                      <Link
                        href="/research/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-sky-600" />
                        </div>
                        控制台
                      </Link>
                      {/* 租户管理员导航菜单 */}
                        {session?.user?.role === 'TENANTADMIN' && (
                        <>
                          <Link
                            style={{ display: 'none' }}
                            href="/auth/tenant-admin/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                          >
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                              <Settings className="w-4 h-4 text-sky-600" />
                            </div>
                            租户配置
                          </Link>
                        </>
                        )}
                      {/* admin 用户显示 prompt 调优和用户管理菜单 */}
                      {session?.user?.role === 'ADMIN' && (
                        <>
                          <Link
                            style={{ display: 'none' }}
                            href="/auth/admin/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                          >
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                              <Settings className="w-4 h-4 text-sky-600" />
                            </div>
                            系统配置
                          </Link>
                        </>
                      )}

                      <div className="my-2 border-t border-slate-100"></div>

                      <button
                        onClick={() => {
                          setDropdownOpen(false)
                          signOut({ callbackUrl: '/?logout=true' })
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 课题列表区域 */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 空状态 */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sky-100 to-blue-100 rounded-3xl flex items-center justify-center mb-6">
              <GraduationCap className="w-12 h-12 text-sky-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">开启您的研究之旅</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              从一个想法开始，我们可以帮助您将其转化为高质量的学术课题
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 shadow-lg shadow-sky-200"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              创建第一个课题
            </Button>
          </motion.div>
        ) : (
          /* 课题网格 */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/research/${project.id}/ideation`}
                  className="block group"
                >
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300 h-full flex flex-col"
                  >
                    {/* 卡片头部：不展示课题状态角标 */}
                    <div className="flex items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* 标题和描述 */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2 mb-2">
                        {project.title}
                      </h3>
                      
                    </div>



                    {/* 底部信息 */}
                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                      <span>创建于 {formatDate(project.createdAt)}</span>
                      <motion.span
                        className="flex items-center text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        进入
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </motion.span>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* 底部装饰 */}
      <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent" />

      {/* Dialog Overlay - 双栏布局 */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsDialogOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[slate-800]">新建处方</h2>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="text-[slate-400] hover:text-[slate-800] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 双栏布局 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左边：已有明确选题 */}
                <form onSubmit={handleClearTitleSubmit} className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-[slate-200]/40 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-[#f0ebe3] rounded-lg">
                        <Search className="w-5 h-5 text-[teal-600]" />
                      </div>
                      <h3 className="font-semibold text-[slate-800]">我已有明确选题</h3>
                    </div>

                    <div>
                      <Label htmlFor="clearTitle" className="text-[slate-800] text-sm font-medium">
                        请输入您的选题
                      </Label>
                      <textarea
                        id="clearTitle"
                        value={clearTitleForm.title}
                        onChange={(e) => updateClearTitleForm('title', e.target.value)}
                        placeholder="例如：高中数学课堂互动教学研究"
                        rows={5}
                        className={`mt-2 flex w-full rounded-xl border bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-[slate-400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[teal-600] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${clearTitleErrors.title ? 'border-red-500 focus-visible:ring-red-500' : 'border-[slate-200] focus:border-[teal-600]'}`}
                      />
                      {clearTitleErrors.title && (
                        <p className="mt-1 text-sm text-red-500">{clearTitleErrors.title}</p>
                      )}
                    </div>



                    <Button
                      type="submit"
                      className="w-full mt-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '创建中...' : '文献检索'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>

                {/* 右边：需要构思选题 */}
                <form onSubmit={handleIdeationSubmit} className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-[slate-200]/40 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-[#f0ebe3] rounded-lg">
                        <Sparkles className="w-5 h-5 text-[teal-600]" />
                      </div>
                      <h3 className="font-semibold text-[slate-800]">我需要帮助构思选题</h3>
                    </div>

                    <div>
                      <Label htmlFor="ideationDescription" className="text-[slate-800] text-sm font-medium">
                        初始构思或关键词（选填）
                      </Label>
                      <textarea
                        id="ideationDescription"
                        value={ideationForm.description}
                        onChange={(e) => updateIdeationForm('description', e.target.value)}
                        placeholder="描述您的研究方向、感兴趣的话题或脑海中的关键词..."
                        rows={5}
                        className="mt-2 flex w-full rounded-xl border border-[slate-200] bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-[slate-400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[teal-600] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                    </div>



                    <Button
                      type="submit"
                      className="w-full mt-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '创建中...' : '开始构思'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
