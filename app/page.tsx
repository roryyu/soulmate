'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
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

// 粒子效果组件
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/20 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
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
function GlowingOrb() {
  return (
    <div className="relative w-64 h-64 md:w-96 md:h-96">
      {/* 外层光晕 */}
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
      {/* 中层光晕 */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(14, 165, 233, 0.2) 50%, rgba(56, 189, 248, 0) 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {/* 内层核心 */}
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
      {/* 装饰环 */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-sky-200/30"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}


// Hero区域组件
function HeroSection() {
  const { data: session } = useSession()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  })
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 via-white to-white" />
      
      {/* 粒子背景 */}
      <ParticleBackground />
      
      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        style={{ y, opacity }}
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 左侧内容 */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="text-center lg:text-left"
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 text-sky-700 text-sm font-medium">
                <Zap className="w-4 h-4" />
                数字疗愈工具
              </span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6"
            >
              Soulmate
              <br />   
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                疗愈全人类
              </span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              全流程数字疗愈
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {session ? (
                  <Link href="/research/dashboard">
                    <Button 
                      size="lg"
                      className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 shadow-lg shadow-sky-200"
                    >
                      开启我的灵犀瞬间
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    size="lg"
                    className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 shadow-lg shadow-sky-200"
                    onClick={() => signIn(undefined, { callbackUrl: '/research/dashboard' })}
                  >
                    开启我的灵犀瞬间
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
          
          {/* 右侧视觉 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center"
          >
            <GlowingOrb />
          </motion.div>
        </div>
      </motion.div>
      
      {/* 底部装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}

// 六大功能展示组件
function ProcessSection() {
  const features = [
    {
      icon: Lightbulb,
      title: '选题构思',
      subtitle: 'IDEATION',
      desc: '输入教学感悟，AI 自动生成标准选题',
      color: 'from-amber-400 to-orange-500'
    },
    {
      icon: Search,
      title: '文献检索',
      subtitle: 'SEARCH',
      desc: '智能检索相关文献，提供研究参考',
      color: 'from-sky-400 to-blue-500'
    },
    {
      icon: FileText,
      title: '文献速读',
      subtitle: 'READING',
      desc: '快速阅读文献，提取核心观点',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      icon: Layers,
      title: '文献综述',
      subtitle: 'OUTLINES',
      desc: '自动生成文献综述与大纲框架',
      color: 'from-violet-400 to-purple-500'
    },
    {
      icon: Database,
      title: '数字疗愈写作',
      subtitle: 'WRITING',
      desc: '辅助撰写论文，提供结构建议',
      color: 'from-pink-400 to-rose-500'
    },
    {
      icon: Sparkles,
      title: '数字疗愈润色',
      subtitle: 'POLISHING',
      desc: '智能润色优化，提升论文质量',
      color: 'from-cyan-400 to-sky-500'
    }
  ]

  return (
    <section id="products" className="relative py-24 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            六大核心功能，覆盖数字疗愈全流程
          </h2>
          <p className="text-slate-500 text-lg">从灵感到成果，一站式智能数字疗愈助手</p>
        </motion.div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"
            >
              {/* 图标 */}
              <div 
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-md`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              
              {/* 英文标签 */}
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {feature.subtitle}
              </span>
              
              {/* 标题 */}
              <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                {feature.title}
              </h3>
              
              {/* 描述 */}
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA 区域组件
function CTASection() {
  const { data: session } = useSession()

  return (
    <section className="relative py-24 overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            别让您的教学智慧，埋没在繁琐的范式中。
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            让每一次备课的灵光一闪，都成为推动教育进步的阶梯。
          </p>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {session ? (
              <Link href="/research/dashboard">
                <Button 
                  size="lg"
                  className="rounded-full bg-white text-slate-900 hover:bg-slate-100 px-8 shadow-xl"
                >
                  马上体验"灵犀一点"
                  <Sparkles className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button 
                size="lg"
                className="rounded-full bg-white text-slate-900 hover:bg-slate-100 px-8 shadow-xl"
                onClick={() => signIn(undefined, { callbackUrl: '/research/dashboard' })}
              >
                马上体验"灵犀一点"
                <Sparkles className="ml-2 w-4 h-4" />
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// 首页右侧：扫码加入咨询群（弹层展示 public/Wechat.jpg）
function ConsultationGroupFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.button
        style={{ display: 'none' }}
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-40 right-3 sm:right-5 bottom-28 md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex flex-col items-center gap-1.5 rounded-2xl border border-sky-200/80 bg-white/95 px-3 py-3 shadow-lg shadow-sky-100/80 backdrop-blur-sm text-sky-700 hover:bg-sky-50 hover:border-sky-300 transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="打开咨询群二维码"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <QrCode className="w-6 h-6" strokeWidth={2} />
        <span className="text-xs font-semibold leading-none">咨询群</span>
      </motion.button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultation-qr-title"
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="consultation-qr-title" className="pr-10 text-lg font-semibold text-slate-800">
              加入咨询群
            </h2>
            <p className="mt-1 text-sm text-slate-500">使用微信扫描下方二维码即可加入</p>
            <div className="mt-5 flex justify-center rounded-xl bg-slate-50 p-4">
              <Image
                src="/Wechat.jpg"
                alt="咨询群二维码"
                width={280}
                height={280}
                className="h-auto w-full max-w-[280px] rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}



// 主页面组件
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <ConsultationGroupFab />
      <HeroSection />
      <ProcessSection />
      <CTASection />
      <Footer />
    </main>
  )
}
