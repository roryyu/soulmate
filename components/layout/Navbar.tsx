'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  ArrowRight,
  Lightbulb,
  FileText,
  Database,
  MessageSquare,
  Zap,
  Layers,
  Settings,
  LogOut,
  User,
  Users,
  ChevronDown,
  Search,
  Crown,
  Coins,
  CreditCard,
  Receipt,
  LayoutDashboard,
  Sliders,
  ClipboardList,
  Tags,
  QrCode,
  X,
} from 'lucide-react'

// Navbar 组件
function Navbar({ currentPath }: { currentPath?: string }) {
  const { data: session, status } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和副标题 */}
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.01 }}
          >
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {/* 使用 next/image 优化 LCP（替代 img） */}
              <Image src="/logo.jpg" alt="研灵犀" width={40} height={40} className="w-10 h-10 object-contain" priority />
              <div>
                <h1 className="text-lg font-bold text-slate-900">研灵犀</h1>
                <p className="text-xs text-slate-500">科研全流程管理</p>
              </div>
            </Link>
          </motion.div>

          {/* 用户区域 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4"
          >
            {status === 'loading' ? (
              <div className="text-sm text-slate-400">加载中...</div>
            ) : session ? (
              <div className="flex items-center gap-3">
                <Link href="/research/dashboard">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                  >
                    进入控制台
                  </Button>
                </Link>
                
                {/* 用户头像下拉框 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    {/* 头像 */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                      {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
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
                        <p className="text-sm font-semibold text-slate-700">{session.user?.name || '用户'}</p>
                        <p className="text-xs text-slate-500 truncate">{session.user?.email}</p>
                      </div>

                      {/* 菜单项 */}
                      <div className="py-2">
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        >
                          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                            <Settings className="w-4 h-4 text-sky-600" />
                          </div>
                          账户设置
                        </Link>

                        {/* 会员、积分与支付入口 */}
                        <Link
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
                        {/* 管理员导航菜单 */}
                        {session?.user?.role === 'ADMIN' && (
                        <>
                          <Link
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
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                  onClick={() => signIn(undefined, { callbackUrl: '/payment' })}
                >
                  <Crown className="w-4 h-4 mr-1.5" />
                  会员计划
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full border-sky-200 text-sky-600 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors"
                  onClick={() => signIn(undefined, { callbackUrl: '/research/dashboard' })}
                >
                  登录
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar