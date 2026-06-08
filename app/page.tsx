'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

/* ─── 音符粒子 Canvas ─── */
function MusicParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    let w = 0, h = 0

    const notes = ['♪', '♫', '♬', '♩', '♭', '♮', '♯']
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    ]

    interface Particle {
      x: number; y: number; vx: number; vy: number
      char: string; color: string; size: number
      opacity: number; rotation: number; rotSpeed: number
    }

    const particles: Particle[] = []

    function resize() {
      w = canvas!.width = canvas!.clientWidth * devicePixelRatio
      h = canvas!.height = canvas!.clientHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }

    function spawn(): Particle {
      return {
        x: Math.random() * (w / devicePixelRatio),
        y: (h / devicePixelRatio) + 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -Math.random() * 1.2 - 0.4,
        char: notes[Math.floor(Math.random() * notes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 18 + 12,
        opacity: 0,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      }
    }

    for (let i = 0; i < 25; i++) {
      const p = spawn()
      p.y = Math.random() * (h / devicePixelRatio)
      p.opacity = Math.random() * 0.5 + 0.1
      particles.push(p)
    }

    function draw() {
      const cw = w / devicePixelRatio
      const ch = h / devicePixelRatio
      ctx.clearRect(0, 0, cw, ch)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed

        if (p.y < -30) {
          particles[i] = spawn()
          continue
        }

        const lifeRatio = 1 - Math.max(0, (ch - p.y) / ch)
        p.opacity = lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 * 0.6 : Math.min(lifeRatio * 3, 0.6)

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.font = `${p.size}px serif`
        ctx.fillStyle = p.color
        ctx.textAlign = 'center'
        ctx.fillText(p.char, 0, 0)
        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.35 }}
    />
  )
}

/* ─── 声波动画条 ─── */
function SoundWave({ color = '#FF6B6B', delay = 0 }: { color?: string; delay?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            backgroundColor: color,
            animation: `soundBar 1.2s ease-in-out ${delay + i * 0.1}s infinite`,
            height: '100%',
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  )
}

/* ─── 流动彩色弧线 ─── */
function FlowingArcs() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="arc1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="arc2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#45B7D1" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#DDA0DD" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="arc3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F7DC6F" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#82E0AA" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path d="M-50,500 C200,200 500,700 800,300 S1200,500 1500,200" stroke="url(#arc1)" strokeWidth="80" fill="none">
        <animate attributeName="d" values="M-50,500 C200,200 500,700 800,300 S1200,500 1500,200;M-50,400 C300,600 400,100 750,500 S1100,200 1500,400;M-50,500 C200,200 500,700 800,300 S1200,500 1500,200" dur="18s" repeatCount="indefinite" />
      </path>
      <path d="M-50,300 C150,600 450,100 700,500 S1000,200 1500,450" stroke="url(#arc2)" strokeWidth="60" fill="none">
        <animate attributeName="d" values="M-50,300 C150,600 450,100 700,500 S1000,200 1500,450;M-50,500 C250,150 500,600 800,250 S1100,500 1500,300;M-50,300 C150,600 450,100 700,500 S1000,200 1500,450" dur="22s" repeatCount="indefinite" />
      </path>
      <path d="M-50,600 C200,300 500,500 800,200 S1100,450 1500,350" stroke="url(#arc3)" strokeWidth="45" fill="none">
        <animate attributeName="d" values="M-50,600 C200,300 500,500 800,200 S1100,450 1500,350;M-50,250 C300,500 450,200 750,450 S1050,150 1500,500;M-50,600 C200,300 500,500 800,200 S1100,450 1500,350" dur="25s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}

/* ─── Hero ─── */
function HeroSection() {
  const { data: session } = useSession()

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '92vh' }}>
      {/* 底层流动弧线 */}
      <FlowingArcs />

      {/* 音符粒子 */}
      <MusicParticles />

      {/* 渐变光晕 */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20"
        style={{ background: 'radial-gradient(circle, #FF6B6B 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-15"
        style={{ background: 'radial-gradient(circle, #4ECDC4 0%, transparent 70%)' }} />
      <div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] rounded-full blur-[80px] opacity-10"
        style={{ background: 'radial-gradient(circle, #DDA0DD 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '92vh' }}>
        {/* 声波装饰 */}
        <div className="flex items-center gap-6 mb-10">
          <SoundWave color="#FF6B6B" delay={0} />
          <SoundWave color="#4ECDC4" delay={0.3} />
          <SoundWave color="#45B7D1" delay={0.6} />
        </div>

        <h1
          className="font-bold leading-[1.05] mb-8 tracking-tight"
          style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 30%, #45B7D1 60%, #DDA0DD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Soulmates
        </h1>

        <p
          className="mb-4 max-w-2xl leading-relaxed"
          style={{
            fontSize: 'clamp(18px, 2.5vw, 28px)',
            color: '#2d3436',
            fontWeight: 300,
            letterSpacing: '0.04em',
          }}
        >
          疗愈全人类
        </p>

        <p
          className="mb-14 max-w-xl leading-relaxed"
          style={{
            fontSize: 'clamp(14px, 1.6vw, 18px)',
            color: '#636e72',
            letterSpacing: '0.06em',
          }}
        >
          全流程数字疗愈 · 从灵感到成果 · 一站式智能管理
        </p>

 

        {/* 底部五线谱装饰 */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col gap-[6px] opacity-[0.12]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[1px] bg-[#2d3436]" style={{ width: `${280 - i * 20}px` }} />
          ))}
        </div>
      </div>
    </section>
  )
}


/* ─── 主页面 ─── */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* 全局动画 keyframes */}
      <style jsx global>{`
        @keyframes soundBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <Navbar />
      <HeroSection />
      <Footer />
    </main>
  )
}
