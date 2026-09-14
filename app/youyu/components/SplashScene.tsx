'use client'

/**
 * 场景 1：有屿·宇宙开机 + 30 秒脑电采集
 * - 星环轨道上运行的星星（canvas 动画：椭圆轨道 + 近大远小 + 拖尾闪烁）
 * - 星环上稀疏洒落的音符（canvas 动画）
 * - 脑机接口连接状态机（搜索 → 佩戴检测 → 连接成功）
 * - 30 秒 EEG 采集覆盖层（环形倒计时 + 脑电波 canvas）
 * idle=true 时为「返回」态：直接展示已连接，不再倒计时。
 */
import { useEffect, useRef, useState } from 'react'
import { AudioEngine } from '../lib/audio'
import { IMAGES } from '../lib/data'
import { createTimerBag } from '../lib/timers'

const GLYPHS = ['♪', '♫', '♩', '♬', '✦']
const RING_C = 339.3
const EEG_TOTAL = 30

interface Props {
  active: boolean
  idle: boolean
  /** EEG 采集完成，进入下一幕（由上层用穿越动效包裹） */
  onEegComplete: () => void
}

export default function SplashScene({ active, idle, onEegComplete }: Props) {
  const splashCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const eegCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const completeRef = useRef(onEegComplete)
  completeRef.current = onEegComplete

  const [status, setStatus] = useState('正在搜索设备…')
  const [dotClass, setDotClass] = useState('bci-dot')
  const [barsOn, setBarsOn] = useState(0)
  const [hint, setHint] = useState('请拿起头环，佩戴于前额')
  const [eegOn, setEegOn] = useState(false)
  const [eegSec, setEegSec] = useState(EEG_TOTAL)

  /* ---- 星环轨道星星 + 洒落音符（active 时循环） ---- */
  useEffect(() => {
    if (!active) return
    const cv = splashCanvasRef.current
    if (!cv) return
    const c = cv.getContext('2d')
    if (!c) return
    let raf = 0
    const dpr = window.devicePixelRatio || 1
    let W = 0
    let H = 0
    const resize = () => {
      W = cv.width = cv.offsetWidth * dpr
      H = cv.height = cv.offsetHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)
    interface N { x: number; y: number; vy: number; vx: number; s: number; g: string; o: number }
    const notes: N[] = []
    /* 轨道星星：与背景星环同心的多条椭圆轨道，内圈快、外圈慢 */
    const ORBITS = [0.14, 0.2, 0.27, 0.35, 0.45, 0.57] // 轨道半径（占屏宽比例）
    const ORBIT_CY = 0.155 // 星环中心高度（与背景图对齐）
    const ORBIT_SQ = 0.32 // 椭圆压扁比（透视）
    interface S { oi: number; ang: number; spd: number; sz: number; ph: number; tws: number; gold: boolean }
    const stars: S[] = []
    ORBITS.forEach((r, oi) => {
      const n = oi < 2 ? 1 : oi < 4 ? 2 : 3
      for (let k = 0; k < n; k++) {
        stars.push({
          oi,
          ang: Math.random() * Math.PI * 2,
          spd: 0.014 * Math.sqrt(0.14 / r) * (0.85 + Math.random() * 0.3),
          sz: 1 + Math.random() * 1.6,
          ph: Math.random() * Math.PI * 2,
          tws: 0.03 + Math.random() * 0.04,
          gold: Math.random() < 0.18,
        })
      }
    })
    let t = 0
    const loop = () => {
      t++
      if (Math.random() < 0.14) {
        notes.push({
          x: 0.32 + Math.random() * 0.36, y: 0.07 + Math.random() * 0.03,
          vy: 0.0005 + Math.random() * 0.0007, vx: (Math.random() - 0.5) * 0.00025,
          s: 6 + Math.random() * 6, g: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], o: 0.9,
        })
      }
      c.clearRect(0, 0, W, H)
      /* 轨道星星：远侧小而暗、近侧大而亮，带拖尾残影与闪烁 */
      const cx = 0.5 * W
      const cy = ORBIT_CY * H
      ORBITS.forEach((r) => {
        c.beginPath()
        c.ellipse(cx, cy, r * W, r * W * ORBIT_SQ, 0, 0, Math.PI * 2)
        c.strokeStyle = 'rgba(150,210,255,.05)'
        c.lineWidth = dpr
        c.stroke()
      })
      stars.forEach((s) => {
        s.ang += s.spd
        const rx = ORBITS[s.oi] * W
        const ry = rx * ORBIT_SQ
        const x = cx + rx * Math.cos(s.ang)
        const y = cy + ry * Math.sin(s.ang)
        const near = (Math.sin(s.ang) + 1) / 2
        const tw = 0.72 + 0.28 * Math.sin(t * s.tws + s.ph)
        const a = (0.35 + 0.65 * near) * tw
        const sz = s.sz * (0.7 + 0.5 * near) * dpr
        const col = s.gold ? '255,217,138' : '185,225,255'
        for (let k = 3; k >= 1; k--) {
          const pa = s.ang - k * 0.055
          c.globalAlpha = a * (0.1 + (3 - k) * 0.06)
          c.fillStyle = `rgba(${col},1)`
          c.beginPath()
          c.arc(cx + rx * Math.cos(pa), cy + ry * Math.sin(pa), sz * (0.35 + (3 - k) * 0.12), 0, Math.PI * 2)
          c.fill()
        }
        c.globalAlpha = a
        c.shadowColor = s.gold ? 'rgba(255,217,138,.9)' : 'rgba(140,200,255,.9)'
        c.shadowBlur = 9 * dpr
        c.fillStyle = `rgba(${col},1)`
        c.beginPath()
        c.arc(x, y, sz, 0, Math.PI * 2)
        c.fill()
        c.shadowBlur = 0
        if (s.sz > 2 && near > 0.55) {
          c.globalAlpha = a * 0.5
          c.strokeStyle = `rgba(${col},1)`
          c.lineWidth = 0.8 * dpr
          const L = sz * 4
          c.beginPath()
          c.moveTo(x - L, y); c.lineTo(x + L, y)
          c.moveTo(x, y - L); c.lineTo(x, y + L)
          c.stroke()
        }
      })
      c.globalAlpha = 1
      notes.forEach((n) => {
        n.y += n.vy
        n.x += n.vx
        if (n.y > 0.38) n.o -= 0.0022
        c.globalAlpha = Math.max(0, n.o * 0.9)
        c.fillStyle = '#e6efff'
        c.shadowColor = '#8fc6ff'
        c.shadowBlur = 8 * dpr
        c.font = n.s * dpr + 'px serif'
        c.fillText(n.g, n.x * W, n.y * H)
        c.shadowBlur = 0
        const lg = c.createLinearGradient(n.x * W, n.y * H - 60 * dpr, n.x * W, n.y * H)
        lg.addColorStop(0, 'rgba(180,220,255,0)')
        lg.addColorStop(1, 'rgba(200,225,255,.25)')
        c.fillStyle = lg
        c.fillRect(n.x * W - 0.5, n.y * H - 60 * dpr, 1 * dpr, 60 * dpr)
      })
      for (let i = notes.length - 1; i >= 0; i--) if (notes[i].o <= 0) notes.splice(i, 1)
      c.globalAlpha = 1
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  /* ---- 连接状态机 / 倒计时 ---- */
  useEffect(() => {
    if (!active) return
    if (idle) {
      // 返回态：直接展示已连接
      setEegOn(false)
      setStatus('已佩戴 · 信号优秀')
      setDotClass('bci-dot ok')
      setBarsOn(5)
      setHint('✦ 已连接，点击右上方「跳过」继续旅程')
      return
    }
    const bag = createTimerBag()
    // 重置为初始态
    setEegOn(false)
    setEegSec(EEG_TOTAL)
    setBarsOn(0)
    setStatus('正在搜索设备…')
    setDotClass('bci-dot')
    setHint('请拿起头环，佩戴于前额')

    bag.later(() => setStatus('已发现设备 · SoulBand-07'), 1200)
    bag.later(() => {
      setStatus('佩戴检测中…')
      setDotClass('bci-dot warn')
      setHint('请将头环贴合前额，指示灯亮起即佩戴成功')
    }, 2600)
    bag.later(() => {
      setStatus('已佩戴 · 信号优秀')
      setDotClass('bci-dot ok')
      for (let i = 0; i < 5; i++) bag.later(() => setBarsOn(i + 1), i * 140)
      setHint('✦ 连接成功')
      AudioEngine.chime(660)
      AudioEngine.playVoice('/youyu/nao1.mp3')
    }, 5200)
    bag.later(() => {
      setEegOn(true)
      // EEG 30 秒倒计时
      let sec = EEG_TOTAL
      let iv = 0
      iv = bag.every(() => {
        sec--
        const left = Math.max(0, sec)
        setEegSec(left)
        if (sec <= 0) {
          window.clearInterval(iv)
          AudioEngine.playVoice('/youyu/nao2.mp3')
          bag.later(() => completeRef.current(), 2200)
        }
      }, 1000)
    }, 7500)

    return () => bag.clear()
  }, [active, idle])

  /* ---- EEG 脑电波 ---- */
  useEffect(() => {
    if (!active || !eegOn) return
    const cv = eegCanvasRef.current
    if (!cv) return
    const c = cv.getContext('2d')
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    cv.width = cv.offsetWidth * dpr
    cv.height = cv.offsetHeight * dpr
    let raf = 0
    let t = 0
    const buf: number[] = []
    const loop = () => {
      t += 0.05
      const v = Math.sin(t * 2.2) * 8 + Math.sin(t * 5.7) * 4 + Math.sin(t * 13) * 3 + (Math.random() - 0.5) * 6
      buf.push(v)
      if (buf.length > 150) buf.shift()
      c.clearRect(0, 0, cv.width, cv.height)
      c.beginPath()
      buf.forEach((y, i) => {
        const x = (i / 150) * cv.width
        const yy = cv.height / 2 + y * dpr
        if (i) c.lineTo(x, yy)
        else c.moveTo(x, yy)
      })
      c.strokeStyle = '#8fb0ff'
      c.lineWidth = 1.6 * dpr
      c.shadowColor = '#8fb0ff'
      c.shadowBlur = 8
      c.stroke()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, eegOn])

  const left = Math.max(0, eegSec)
  const progress = (EEG_TOTAL - left) / EEG_TOTAL

  return (
    <section className={`scene${active ? ' active' : ''}`} id="scene-splash">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cosmos-bg" src={IMAGES.cosmos} alt="" />
      <canvas id="splash-canvas" ref={splashCanvasRef} />
      <div className="splash-content">
        <h1 className="splash-title">有 屿</h1>
        <p className="splash-sub">声音，是宇宙中第一个出现的东西</p>
        <div className="bci-card" id="bci-card">
          <div className="bci-head">
            <span className="bci-ico">🎧</span>
            <div className="bci-titles">
              <b>脑机接口设备</b>
              <i id="bci-status">{status}</i>
            </div>
            <span className={dotClass} id="bci-dot" />
          </div>
          <div className="bci-signal" id="bci-signal">
            <div className="sig-bar">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} className={i < barsOn ? 'on' : ''} />
              ))}
            </div>
            <span id="bci-hint">{hint}</span>
          </div>
        </div>
      </div>

      {/* 30 秒脑电采集覆盖层 */}
      <div className={`eeg-overlay${eegOn ? '' : ' hidden'}`} id="eeg-overlay">
        <div className="eeg-inner">
          <div className="eeg-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" className="ring-bg" />
              <circle
                cx="60" cy="60" r="54" className="ring-fg" id="eeg-ring"
                style={{ strokeDashoffset: RING_C * (1 - progress) }}
              />
            </svg>
            <div className="eeg-count"><b id="eeg-sec">{left}</b><i>秒</i></div>
          </div>
          <p className="eeg-state">请闭眼 · 保持放松</p>
          <div className="eeg-progress">
            <div className="ep-track"><i id="ep-fill" style={{ width: `${progress * 100}%` }} /></div>
            <span id="ep-label">脑电采集进程 {Math.round(progress * 100)}%</span>
          </div>
          <canvas id="eeg-wave" ref={eegCanvasRef} />
        </div>
      </div>
    </section>
  )
}
