'use client'

/**
 * 场景 6：专属疗愈音乐
 * - 声纹录制（迁移自 components/metrics/VoiceScreen）：录一段话经 /api/example/voice
 *   做情绪判断，识别结果通过 onVoiceResult 上报父组件（YouyuApp）保存到全局 state
 * - 4.2 秒「谱写中」动效 → 生成式疗愈音乐播放（180 秒）
 * - 环形频谱 canvas 可视化；到点或点「提前结束」进入报告
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AudioEngine } from '../lib/audio'
import { SPRITES } from '../lib/data'
import { createTimerBag } from '../lib/timers'
import type { ElemKey, SpriteKey } from '../lib/types'

const TOTAL = 180

/** 声纹录制阶段展示的引导文案候选，进入场景时随机选一句 */
const VOICE_HINTS = [
  '我喜欢自己，接受自己',
  '我相信自己拥有一切智慧',
  '无论做什么，我都充满激情',
  '我创造自己的道路',
  '我可以把事情一件一件处理好',
]

interface Props {
  active: boolean
  emo: SpriteKey | null
  elemKey: ElemKey
  onDone: () => void
  /** 声纹情绪判断结果上报（用户录音识别后的文本；无结果/清空时为 null） */
  onVoiceResult?: (result: string | null) => void
  /** 触发父组件（YouyuApp.handleResultDone）请求 /api/music-create 生成 musicUrl */
  onRequestMusic?: () => void
  /** 父组件持有的音乐播放地址；异步生成，就绪后由本场景 <audio> 接管播放 */
  musicUrl?: string | null
}

export default function MusicScene({ active, emo, elemKey, onDone, onVoiceResult, onRequestMusic, musicUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const onVoiceResultRef = useRef(onVoiceResult)
  onVoiceResultRef.current = onVoiceResult
  const onRequestMusicRef = useRef(onRequestMusic)
  onRequestMusicRef.current = onRequestMusic
  const [phase, setPhase] = useState<'voice' | 'gen' | 'play'>('voice')
  const [sec, setSec] = useState(TOTAL)
  /** 用户完成声纹录制、点击「开始谱写」后置 true，触发生成→播放主时序 */
  const [composeStarted, setComposeStarted] = useState(false)
  const sp = SPRITES[emo ?? 'happy']
  /** 每次挂载随机选一句引导文案，重渲染时保持不变 */
  const voiceHint = useMemo(
    () => VOICE_HINTS[Math.floor(Math.random() * VOICE_HINTS.length)],
    [],
  )

  /* ---- 声纹录制（迁移自 VoiceScreen：权限检查 / MediaRecorder / 上传识别） ---- */
  const [isRecording, setIsRecording] = useState(false)
  const [voiceText, setVoiceText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null) // null=检查中
  const [elapsed, setElapsed] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 识别结果变化 → 上报父组件保存到全局 state（初始/清空时同步 null）
  useEffect(() => {
    onVoiceResultRef.current?.(voiceText)
  }, [voiceText])

  // 仅在声纹阶段激活时检查麦克风权限（场景常驻挂载，避免过早请求）
  useEffect(() => {
    if (!active || phase !== 'voice') return
    let cancelled = false
    const check = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const st = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          if (!cancelled) setHasPermission(st.state === 'granted')
          st.onchange = () => setHasPermission(st.state === 'granted')
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((t) => t.stop())
          if (!cancelled) setHasPermission(true)
        }
      } catch {
        if (!cancelled) setHasPermission(false)
      }
    }
    void check()
    return () => { cancelled = true }
  }, [active, phase])

  // 离开场景：停止录音、释放麦克风，并把流程重置回「声纹」阶段（保留已识别文本）
  useEffect(() => {
    if (active) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsRecording(false)
    setElapsed(0)
    setError(null)
    setPhase('voice')
    setComposeStarted(false)
    setSec(TOTAL)
  }, [active])

  const sendAudio = useCallback(async (blob: Blob) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      const response = await fetch('/api/example/voice', { method: 'POST', body: formData })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '识别失败')
      }
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setVoiceText(data.text || '无识别结果')
      //自动开始生成音乐
      beginCompose()
    } catch (err) {
      let message = (err as Error).message
      if (message.includes('empty') || message.includes('Empty')) {
        message = '录音内容为空，请开始录音并说话后再结束'
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setVoiceText(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await sendAudio(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
      startTimeRef.current = Date.now()
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000)
      }, 100)
    } catch (err) {
      setError('无法访问麦克风: ' + (err as Error).message)
      setHasPermission(false)
    }
  }, [sendAudio])

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current && isRecording) {
      const duration = Date.now() - startTimeRef.current
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (duration < 500) setError('录音时间太短，请至少录制 0.5 秒')
    }
  }, [isRecording])

  // 单击切换：开始 / 结束录音
  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording()
    else void startRecording()
  }, [isRecording, startRecording, stopRecording])

  // 声纹完成 → 进入「谱写中」，随后由主时序切到播放
  const beginCompose = useCallback(() => {
    if (isRecording || loading) return
    setComposeStarted(true)
    // 通知父组件请求 /api/music-create 生成 musicUrl；生成期间由「谱写中」动效占位，
    // 就绪后 <audio> 接管播放（未就绪则用 AudioEngine 本地合成兜底）
    onRequestMusicRef.current?.()
  }, [isRecording, loading])

  /* ---- 生成 → 播放 主时序（composeStarted 触发；phase 不入依赖，避免切 play 时被清理） ---- */
  useEffect(() => {
    if (!active || !composeStarted) return
    const bag = createTimerBag()
    setPhase('gen')
    setSec(TOTAL)
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
  }, [active, composeStarted])

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
      <div className={`music-voice${phase === 'voice' ? '' : ' hidden'}`} id="music-voice">
        <p className="music-bless">
          ✦ 录制你的声音 ✦<br />
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>说一句话，让有屿读懂你此刻的情绪</span><br/>
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>你可以说：{voiceHint}</span>
        </p>
        <div className="voice-rec">
          <button
            type="button"
            className={`voice-btn${isRecording ? ' rec' : ''}`}
            disabled={loading || hasPermission === false}
            title={hasPermission === false ? '请先授予麦克风权限' : ''}
            onClick={hasPermission === false ? undefined : toggleRecording}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
            </svg>
          </button>
          <div className="voice-status">
            {hasPermission === false
              ? '麦克风权限未授予'
              : hasPermission === null
                ? '正在检查权限…'
                : loading
                  ? '情绪判断中…'
                  : isRecording
                    ? '点击结束录音'
                    : '点击开始录音'}
          </div>
          {(isRecording || elapsed > 0) && (
            <div className="voice-time"><b>{elapsed.toFixed(1)}</b><small>s</small></div>
          )}
        </div>
        {hasPermission === false && (
          <p className="voice-error">麦克风权限未授予：请在浏览器设置中允许访问麦克风，然后刷新页面重试。</p>
        )}
        {error && <p className="voice-error">{error}</p>}
        {voiceText && <div className="voice-result">✓ 情绪判断完成</div>}
        <button className="ghost-btn" id="btn-music-compose" onClick={beginCompose} disabled={isRecording || loading}>
          开始谱写疗愈乐曲 →
        </button>
      </div>
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
