'use client'

/**
 * 场景 7：专属疗愈音乐
 * - 4.2 秒「谱写中」动效 → 生成式疗愈音乐播放（180 秒）
 * - 环形频谱 canvas 可视化；到点或点「提前结束」进入报告
 * - 声纹情绪识别已拆分为独立场景 VoiceScene（在本场景之前）
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AudioEngine } from '../lib/audio'
import { SPRITES } from '../lib/data'
import { createTimerBag } from '../lib/timers'
import type { ElemKey, SpriteKey } from '../lib/types'

const TOTAL = 180

interface Props {
  active: boolean
  emo: SpriteKey | null
  elemKey: ElemKey
  onDone: () => void
  /** 触发父组件（YouyuApp.handleResultDone）请求 /api/music-create 生成 musicUrl */
  onRequestMusic?: () => void
  /** 父组件持有的音乐播放地址；异步生成，就绪后由本场景 <audio> 接管播放 */
  musicUrl?: string | null
}

export default function MusicScene({ active, emo, elemKey, onDone, onRequestMusic, musicUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const onRequestMusicRef = useRef(onRequestMusic)
  onRequestMusicRef.current = onRequestMusic
  const [phase, setPhase] = useState<'gen' | 'play'>('gen')
  const [sec, setSec] = useState(TOTAL)
  const sp = SPRITES[emo ?? 'happy']

  /* ---- 生成 → 播放 主时序（active 触发；phase 不入依赖，避免切 play 时被清理） ---- */
  useEffect(() => {
    if (!active) return
    const bag = createTimerBag()
    setPhase('gen')
    setSec(TOTAL)
    // 通知父组件请求 /api/music-create 生成 musicUrl；生成期间由「谱写中」动效占位，
    // 就绪后 <audio> 接管播放（未就绪则用 AudioEngine 本地合成兜底）
    onRequestMusicRef.current?.()
    bag.later(() => {
      setPhase('play')
      let s = TOTAL
      bag.every(() => {
        s--
        setSec(Math.max(0, s))
        if (s <= 0) doneRef.current()
      }, 1000)
    }, 4200)
    return () => { bag.clear() }
  }, [active])

  /* ---- 音频播放：优先远端 musicUrl，未就绪时用 AudioEngine 本地合成兜底 ---- */
  useEffect(() => {
    if (!active || phase !== 'play') return
    const audio = audioRef.current
    if (musicUrl && audio) {
      // musicUrl 可能在 phase='play' 之后才到达：先关掉本地兜底音轨，避免双音叠加
      AudioEngine.stop()
      void audio.play().catch(() => {})
      return () => { audio.pause() }
    }
    AudioEngine.start(elemKey)
    return () => { AudioEngine.stop() }
  }, [active, phase, musicUrl, elemKey])

  /* ---- 环形频谱可视化 ---- */
  useEffect(() => {
    if (!active || phase !== 'play') return
    const cv = canvasRef.current
    if (!cv) return
    const c = cv.getContext('2d')
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    cv.width = cv.offsetWidth * dpr
    cv.height = cv.offsetHeight * dpr
    let raf = 0
    let t = 0
    const loop = () => {
      t += 0.02
      c.clearRect(0, 0, cv.width, cv.height)
      const cx = cv.width / 2
      const cy = cv.height / 2
      const R = cv.height * 0.26
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2 + t * 0.3
        const w = Math.abs(Math.sin(i * 1.7 + t * 4) * Math.sin(t * 1.3 + i * 0.4)) * cv.height * 0.3 + 6
        const g = c.createLinearGradient(cx, cy, cx + Math.cos(a) * (R + w), cy + Math.sin(a) * (R + w))
        g.addColorStop(0, 'rgba(143,176,255,.9)')
        g.addColorStop(1, 'rgba(255,217,138,.15)')
        c.strokeStyle = g
        c.lineWidth = 2 * dpr
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
        c.lineTo(cx + Math.cos(a) * (R + w), cy + Math.sin(a) * (R + w))
        c.stroke()
      }
      const core = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.85)
      core.addColorStop(0, 'rgba(255,240,210,.95)')
      core.addColorStop(1, 'rgba(143,176,255,.1)')
      c.fillStyle = core
      c.beginPath()
      c.arc(cx, cy, R * 0.8 + Math.sin(t * 2) * 6 * dpr, 0, 7)
      c.fill()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, phase])

  const mm = Math.floor(sec / 60)
  const ss = String(sec % 60).padStart(2, '0')
  return (
    <section className={`scene${active ? ' active' : ''}`} id="scene-music">
      <div className={`music-gen${phase === 'gen' ? '' : ' hidden'}`} id="music-gen">
        <p>正在以你的身心数据<br />实时谱写独一无二的疗愈乐曲…</p>
        <div className="gen-notes">
          <span style={{ '--i': 0 } as CSSProperties}>♪</span>
          <span style={{ '--i': 1 } as CSSProperties}>♫</span>
          <span style={{ '--i': 2 } as CSSProperties}>♩</span>
          <span style={{ '--i': 3 } as CSSProperties}>♬</span>
        </div>
      </div>
      <div className={`music-play${phase === 'play' ? '' : ' hidden'}`} id="music-play">
        <p className="music-bless" id="music-bless">
          ✦ {sp.name}为你而作 ✦<br />
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>基于你的身心状态数据实时生成</span>
        </p>
        <canvas id="music-visual" ref={canvasRef} />
        <div className="music-time"><b id="music-left">{mm}:{ss}</b></div>
        <div className="music-bar"><i id="music-bar" style={{ width: `${((TOTAL - sec) / TOTAL) * 100}%` }} /></div>
        <p className="music-tip">戴上耳机，让频率替你抚平褶皱</p>
        <button className="ghost-btn" id="btn-music-end" onClick={() => doneRef.current()}>提前结束 · 生成报告</button>
      </div>
      {/* 远端疗愈乐曲播放器：musicUrl 就绪后由上方 effect 触发 play() */}
      <audio ref={audioRef} src={musicUrl || undefined} loop preload="auto" style={{ display: 'none' }} />
    </section>
  )
}
