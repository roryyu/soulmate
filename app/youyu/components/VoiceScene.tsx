'use client'

/**
 * 场景 4：声纹情绪识别（从 MusicScene 拆分出来的独立场景）
 * - 录一段话经 /api/example/voice 做情绪判断，识别结果通过 onVoiceResult 上报
 *   父组件（YouyuApp）保存到全局 state，供报告页解读情绪状态
 * - 权限检查 / MediaRecorder / 上传识别 / 计时展示均在此场景内完成
 * - 点击「继续」进入下一场景（有屿世界）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  /** 声纹情绪判断结果上报（识别后的文本；无结果/清空时为 null） */
  onVoiceResult?: (result: string | null) => void
  /** 用户点击「继续」进入下一场景 */
  onDone: () => void
}

export default function VoiceScene({ active, onVoiceResult, onDone }: Props) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const onVoiceResultRef = useRef(onVoiceResult)
  onVoiceResultRef.current = onVoiceResult

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

  /** 每次挂载随机选一句引导文案，重渲染时保持不变 */
  const voiceHint = useMemo(
    () => VOICE_HINTS[Math.floor(Math.random() * VOICE_HINTS.length)],
    [],
  )

  // 识别结果变化 → 上报父组件保存到全局 state（初始/清空时同步 null）
  useEffect(() => {
    onVoiceResultRef.current?.(voiceText)
  }, [voiceText])

  // 仅在场景激活时检查麦克风权限（场景常驻挂载，避免过早请求）
  useEffect(() => {
    if (!active) return
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
  }, [active])

  // 离开场景：停止录音、释放麦克风、清理计时器（保留已识别文本供报告页使用）
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

  // 前进到下一场景（录音中/识别中不允许）
  const handleDone = useCallback(() => {
    if (isRecording || loading) return
    doneRef.current()
  }, [isRecording, loading])

  return (
    <section className={`scene${active ? ' active' : ''}`} id="scene-voice">
      <div className="music-voice" id="music-voice">
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
        <button className="ghost-btn" id="btn-voice-next" onClick={handleDone} disabled={isRecording || loading}>
          继续 →
        </button>
      </div>
    </section>
  )
}
