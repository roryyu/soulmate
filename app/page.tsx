'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// 炫彩流动线条 SVG
function AuroraLines() {
  return (
    <div className="aurora-lines">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff385c" stopOpacity="0.3">
              <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#5e6ad2" stopOpacity="0.2">
              <animate attributeName="stopOpacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#00c896" stopOpacity="0.15">
              <animate attributeName="stopOpacity" values="0.15;0.4;0.15" dur="4s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <linearGradient id="line2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffb400" stopOpacity="0.2">
              <animate attributeName="stopOpacity" values="0.2;0.45;0.2" dur="5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#ff385c" stopOpacity="0.15">
              <animate attributeName="stopOpacity" values="0.15;0.35;0.15" dur="5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <linearGradient id="line3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.2">
              <animate attributeName="stopOpacity" values="0.2;0.5;0.2" dur="6s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#00c896" stopOpacity="0.2">
              <animate attributeName="stopOpacity" values="0.2;0.45;0.2" dur="6s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>
        {/* 流动线条 1 */}
        <path d="M-100,400 C100,200 300,600 500,350 S800,500 1000,300 1300,450 1400,250"
          stroke="url(#line1)" strokeWidth="2.5" fill="none">
          <animate attributeName="d"
            values="M-100,400 C100,200 300,600 500,350 S800,500 1000,300 1300,450 1400,250;
                    M-100,350 C150,500 250,150 550,450 S750,200 1050,400 1250,200 1400,350;
                    M-100,400 C100,200 300,600 500,350 S800,500 1000,300 1300,450 1400,250"
            dur="8s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 2 */}
        <path d="M-50,200 C200,500 400,100 600,400 S900,150 1100,450 1250,200 1350,350"
          stroke="url(#line2)" strokeWidth="2" fill="none">
          <animate attributeName="d"
            values="M-50,200 C200,500 400,100 600,400 S900,150 1100,450 1250,200 1350,350;
                    M-50,300 C150,100 450,500 650,200 S850,450 1050,150 1300,400 1350,250;
                    M-50,200 C200,500 400,100 600,400 S900,150 1100,450 1250,200 1350,350"
            dur="10s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 3 */}
        <path d="M-100,600 C100,300 350,550 550,250 S850,400 1050,200 1200,350 1400,150"
          stroke="url(#line3)" strokeWidth="1.8" fill="none">
          <animate attributeName="d"
            values="M-100,600 C100,300 350,550 550,250 S850,400 1050,200 1200,350 1400,150;
                    M-100,500 C150,650 300,200 600,500 S800,250 1100,450 1250,200 1400,300;
                    M-100,600 C100,300 350,550 550,250 S850,400 1050,200 1200,350 1400,150"
            dur="12s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 4 — 细线 */}
        <path d="M-50,100 C300,350 500,50 700,300 S1000,100 1200,400"
          stroke="url(#line1)" strokeWidth="1.2" fill="none" opacity="0.5">
          <animate attributeName="d"
            values="M-50,100 C300,350 500,50 700,300 S1000,100 1200,400;
                    M-50,250 C250,50 550,400 750,150 S950,350 1200,100;
                    M-50,100 C300,350 500,50 700,300 S1000,100 1200,400"
            dur="9s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 5 */}
        <path d="M-100,150 C150,400 350,80 600,500 S850,200 1100,350 1300,150 1400,400"
          stroke="url(#line2)" strokeWidth="1.5" fill="none" opacity="0.7">
          <animate attributeName="d"
            values="M-100,150 C150,400 350,80 600,500 S850,200 1100,350 1300,150 1400,400;
                    M-100,300 C200,100 400,500 650,150 S900,400 1150,100 1350,350 1400,200;
                    M-100,150 C150,400 350,80 600,500 S850,200 1100,350 1300,150 1400,400"
            dur="11s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 6 */}
        <path d="M-80,500 C100,150 300,650 520,300 S780,550 980,180 1200,500 1380,280"
          stroke="url(#line3)" strokeWidth="2.2" fill="none" opacity="0.5">
          <animate attributeName="d"
            values="M-80,500 C100,150 300,650 520,300 S780,550 980,180 1200,500 1380,280;
                    M-80,350 C180,600 280,100 580,480 S720,180 1020,520 1200,200 1380,420;
                    M-80,500 C100,150 300,650 520,300 S780,550 980,180 1200,500 1380,280"
            dur="13s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 7 — 极细 */}
        <path d="M-30,350 C180,100 420,550 630,200 S880,450 1080,120 1280,380 1400,200"
          stroke="url(#line1)" strokeWidth="1" fill="none" opacity="0.4">
          <animate attributeName="d"
            values="M-30,350 C180,100 420,550 630,200 S880,450 1080,120 1280,380 1400,200;
                    M-30,200 C220,480 380,120 680,420 S830,100 1120,480 1280,180 1400,350;
                    M-30,350 C180,100 420,550 630,200 S880,450 1080,120 1280,380 1400,200"
            dur="7s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 8 */}
        <path d="M-100,700 C80,350 320,600 540,150 S800,500 1050,280 1250,600 1400,350"
          stroke="url(#line2)" strokeWidth="1.8" fill="none" opacity="0.45">
          <animate attributeName="d"
            values="M-100,700 C80,350 320,600 540,150 S800,500 1050,280 1250,600 1400,350;
                    M-100,450 C120,650 380,200 600,550 S780,150 1080,480 1280,250 1400,550;
                    M-100,700 C80,350 320,600 540,150 S800,500 1050,280 1250,600 1400,350"
            dur="14s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 9 */}
        <path d="M-60,50 C200,300 450,30 680,380 S920,80 1150,420 1300,100 1400,300"
          stroke="url(#line3)" strokeWidth="1.4" fill="none" opacity="0.55">
          <animate attributeName="d"
            values="M-60,50 C200,300 450,30 680,380 S920,80 1150,420 1300,100 1400,300;
                    M-60,200 C160,50 500,400 720,100 S960,380 1100,80 1350,350 1400,120;
                    M-60,50 C200,300 450,30 680,380 S920,80 1150,420 1300,100 1400,300"
            dur="10.5s" repeatCount="indefinite" />
        </path>
        {/* 流动线条 10 — 最细装饰线 */}
        <path d="M-40,250 C250,500 480,180 700,450 S950,100 1180,350 1350,180 1400,420"
          stroke="url(#line1)" strokeWidth="0.8" fill="none" opacity="0.35">
          <animate attributeName="d"
            values="M-40,250 C250,500 480,180 700,450 S950,100 1180,350 1350,180 1400,420;
                    M-40,400 C200,120 520,480 740,180 S900,420 1220,120 1300,400 1400,200;
                    M-40,250 C250,500 480,180 700,450 S950,100 1180,350 1350,180 1400,420"
            dur="11.5s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  )
}

// Hero 区域
function HeroSection() {
  const { data: session } = useSession()

  return (
    <section className="pt-20">
      <div className="hero-aurora max-w-[1280px] mx-auto px-6 lg:px-10 py-32 rounded-none">
        <AuroraLines />
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h1 className="hero-title hero-glow text-[40px] md:text-[52px] lg:text-[60px] font-bold leading-[1.1] mb-6 tracking-tight">
            Soulmates
            <br />
            疗愈全人类
          </h1>
          <p className="text-[18px] md:text-[20px] text-[#3f3f3f] leading-[1.5] mb-12 ">
            全流程数字疗愈 · 从灵感到成果 · 一站式智能管理
          </p>
        </div>
      </div>
    </section>
  )
}

// 主页面
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <Footer />
    </main>
  )
}
