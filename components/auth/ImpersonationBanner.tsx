'use client'

import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import { UserCheck, LogOut, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ImpersonationBanner() {
  const { data: session } = useSession()

  // 检查是否在模拟登录状态
  if (!session?.user?.isImpersonating) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">
                正在以 <span className="font-bold">{session.user.name || session.user.email}</span> 的身份浏览
              </p>
              <p className="text-xs text-amber-600">
                您当前正在模拟该用户的操作，所有操作都将以该用户的身份执行
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/auth/admin/users' })}
            className="flex items-center gap-2 text-xs h-8 px-3 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <LogOut className="w-3 h-3" />
            退出模拟登录
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
