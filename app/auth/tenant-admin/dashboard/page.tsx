'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
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
  Shield, 
  Building, 
  Package, 
  Folder,
} from 'lucide-react'

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

// 管理员导航配置
const adminNavItems = [
  {
    url: '/auth/tenant-admin/users',
    title: '用户管理',
    icon: Users,
    color: 'from-slate-400 to-slate-600',
    desc: '管理平台用户账号和权限'
  },
  {
    url: '/auth/tenant-admin/directory',
    title: '知识库目录',
    icon: Folder,
    color: 'from-sky-400 to-sky-600',
    desc: '管理知识库目录结构和权限'
  }
]

// 管理员仪表盘主内容组件
function AdminDashboardContent() {
  return (
    <section className="pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[600px]">
        <div className="text-center mb-12">
          <motion.h1 
            className="text-3xl md:text-4xl font-bold text-slate-800 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            租户管理员控制台
          </motion.h1>
          <motion.p 
            className="text-lg text-slate-500 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            欢迎使用Soulmate租户管理员控制台，您可以在这里管理您的租户用户
          </motion.p>
        </div>

        {/* 卡片式导航 */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {adminNavItems.map((item, index) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Link href={item.url} className="block">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {item.desc}
                  </p>
                  <div className="flex items-center text-sky-600 hover:text-sky-700 transition-colors">
                    <span className="text-sm font-medium">进入管理</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// 主页面组件
export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 检查权限
  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // 检查是否是租户管理员
    if (session?.user?.role !== 'TENANTADMIN') {
      router.push('/admin/prescription')
      return
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar currentPath="/auth/tenant-admin/dashboard" />
      <AdminDashboardContent />
      <Footer />
    </main>
  )
}