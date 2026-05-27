'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Settings,
  User,
  Crown,
  CreditCard,
  Mail,
  Receipt,
  ChevronRight,
} from 'lucide-react'

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  
  // 修改密码表单状态
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  /** null：尚未拉取；true：已有登录密码，需填当前密码；false：未设置过（如纯手机号注册） */
  const [hasLoginPassword, setHasLoginPassword] = useState<boolean | null>(null)

  // 登录邮箱（可修改，保存后通过 updateSession 刷新 JWT）
  const [emailValue, setEmailValue] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (session?.user?.email) setEmailValue(session.user.email)
  }, [session?.user?.email])

  // 拉取是否已设置登录密码（与后端 bcrypt 判断一致）
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/auth/change-password')
        const data = await response.json()
        if (!cancelled) {
          if (response.ok && typeof data.hasPassword === 'boolean') {
            setHasLoginPassword(data.hasPassword)
          } else {
            // 查询失败时保守处理：仍展示「当前密码」
            setHasLoginPassword(true)
          }
        }
      } catch {
        if (!cancelled) setHasLoginPassword(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  // 检查认证状态
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // 保存登录邮箱
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailSaving(true)
    setEmailMessage({ type: '', text: '' })
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      })
      const data = await response.json()
      if (response.ok) {
        setEmailMessage({ type: 'success', text: data.message || '邮箱已更新' })
        await updateSession()
      } else {
        setEmailMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch {
      setEmailMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setEmailSaving(false)
    }
  }

  // 处理密码修改
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    // 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' })
      setIsLoading(false)
      return
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少需要6个字符' })
      setIsLoading(false)
      return
    }

    if (hasLoginPassword && !currentPassword.trim()) {
      setMessage({ type: 'error', text: '请输入当前密码' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(hasLoginPassword ? { currentPassword } : {}),
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || '密码修改成功' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        // 首次设置密码成功后，之后修改需要当前密码
        setHasLoginPassword(true)
      } else {
        setMessage({ type: 'error', text: data.error || '密码修改失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '服务器错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-300/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl flex items-center justify-center shadow-md">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">账户设置</h1>
          </div>
          <p className="text-slate-500">管理您的账户信息和安全设置</p>
        </motion.div>

        {/* 用户信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-500 rounded-2xl flex items-center justify-center shadow-md">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {session?.user?.name || '用户'}
                  </h3>
                  <p className="text-sm text-slate-500">可修改登录邮箱，用于邮箱密码登录与找回通知</p>
                </div>
              </div>

              {/* 登录邮箱编辑 */}
              <form
                onSubmit={handleSaveEmail}
                className="flex-1 min-w-0 space-y-2 sm:pt-1"
              >
                <Label htmlFor="profile-email" className="text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  登录邮箱
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="your@email.com"
                    className="sm:flex-1 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                  <Button
                    type="submit"
                    disabled={emailSaving}
                    variant="secondary"
                    className="h-11 shrink-0 sm:w-auto"
                  >
                    {emailSaving ? '保存中…' : '保存邮箱'}
                  </Button>
                </div>
                {emailMessage.text && (
                  <p
                    className={`text-sm ${
                      emailMessage.type === 'success'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {emailMessage.text}
                  </p>
                )}
              </form>
            </div>
          </Card>
        </motion.div>

        {/* 会员与积分、订单（支付相关入口） */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-6"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">会员与积分</h2>
            <p className="text-sm text-slate-500 mb-4">管理订阅状态、积分余额与支付订单</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                href="/dashboard/membership"
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-600" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">会员与积分</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
              </Link>
              <Link
                href="/payment"
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-violet-600" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">套餐与充值</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
              </Link>
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-slate-600" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">我的订单</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </Link>
            </div>
          </Card>
        </motion.div>

        {/* 修改密码表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">修改密码</h2>
                <p className="text-sm text-slate-500">定期更换密码可以提高账户安全性</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              {/* 消息提示 */}
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl flex items-center gap-3 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </motion.div>
              )}

              {/* 仅当库中已有 bcrypt 密码时显示「当前密码」（手机号注册等未设置则不显示） */}
              {hasLoginPassword === true && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-slate-700">
                    当前密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="请输入当前密码"
                      className="pl-10 pr-10 py-6 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 新密码 */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-700">
                  新密码
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码（至少6个字符）"
                    className="pl-10 pr-10 py-6 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 确认新密码 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700">
                  确认新密码
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="pl-10 pr-10 py-6 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || hasLoginPassword === null}
                  className="w-full sm:w-auto px-8 py-6 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-medium shadow-lg shadow-sky-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      确认修改密码
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* 安全提示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6"
        >
          <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 p-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">安全提示</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• 请使用至少6个字符的强密码，包含字母、数字和特殊符号</li>
                  <li>• 定期更换密码，避免在多个网站使用相同密码</li>
                  <li>• 如果您怀疑账户被盗，请立即修改密码并联系管理员</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
