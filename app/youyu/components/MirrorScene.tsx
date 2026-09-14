'use client'

/**
 * 场景 3：魔镜秘境
 * - 前置摄像头扫脸 + rPPG 采集（复用 useMeasurement：FaceMesh 检测叠框 / 脉搏波形 / 指标计算，指标只采集不展示）
 * - 模型就绪后自动开始倒计时（MIRROR_SECONDS）与采样，到点进入有屿世界
 * - 语音问答（支持 Web Speech 识别，或用快捷回复 chip）
 * - 底部 rPPG 脉搏波 canvas（真实波形）
 */
import { useEffect, useRef, useState } from 'react'
import { useMeasurement } from '@/hooks/useMeasurement'
import { AudioEngine } from '../lib/audio'
import { IMAGES, MIRROR_ACK, MIRROR_QA, MIRROR_WARNS, SPRITES } from '../lib/data'
import { speak } from '../lib/speech'
import { createTimerBag } from '../lib/timers'
import type { SpriteKey } from '../lib/types'
import type { Metrics } from '@/lib/types'

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SRCtor = new () => SpeechRecognitionLike

/** 魔镜扫脸采样时长（秒）：模型就绪后开始倒计时与 rPPG 采集 */
const MIRROR_SECONDS = 60

interface Props {
  active: boolean
  emo: SpriteKey | null
  /** 倒计时结束或跳过 → 进入有屿世界（上层用穿越动效包裹） */
  onDone: () => void
  /** rPPG 指标上报：录制中每 1.5s 快照 + 收尾/提前离开时的最终值（有效数据才上报） */
  onMetrics?: (metrics: Metrics) => void
}

export default function MirrorScene({ active, emo, onDone, onMetrics }: Props) {
  // rPPG 采集：复用 metrics 的 useMeasurement（摄像头 / FaceMesh 扫脸 / 指标计算），本场景不展示指标
  const m = useMeasurement()
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const answerRef = useRef<(() => void) | null>(null)
  const doneRef = useRef(onDone)
  const onMetricsRef = useRef(onMetrics)
  const wasActiveRef = useRef(false)
  const activeRef = useRef(false)
  doneRef.current = onDone
  onMetricsRef.current = onMetrics
  activeRef.current = active

  const [sec, setSec] = useState(MIRROR_SECONDS)
  const [bubble, setBubble] = useState('')
  const [bubbleKey, setBubbleKey] = useState(0)
  const [chips, setChips] = useState<string[]>([])
  const [chipsSent, setChipsSent] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [warn, setWarn] = useState(false)

  const say = (html: string) => {
    setBubble(html)
    setBubbleKey((k) => k + 1)
  }

  /** 指标上报：EMPTY 快照不上报，避免覆盖父组件已收到的有效值 */
  const reportMetrics = (metrics: Metrics) => {
    if (metrics.hr == null && metrics.beats === 0) return
    console.log('reportMetrics',metrics)
    onMetricsRef.current?.(metrics)
  }

  /** 采样收尾：补发最终分析拿完整指标并上报父组件，再进入有屿世界 */
  const finishMirror = () => {
    void m.stop().then((metrics) => {
      console.info('[mirror] rPPG 最终指标（已上报父组件）:', metrics)
      reportMetrics(metrics)
      m.closeCamera()
      // 收尾等待期间已被跳过/返回 → 不再触发切场景，避免叠加过场动效
      if (!activeRef.current) return
      doneRef.current()
    })
  }

  // 摄像头初始化失败 → 回退示意脸
  useEffect(() => {
    if (active && m.status === 'error') setFallback(true)
  }, [active, m.status])

  // 摄像头生命周期：进入场景时打开（上轮已结束/失败则先重置再重开）；仅在进入瞬间重置，
  // 正常收尾期间 status=done 不会误重开（否则切场景后摄像头泄漏）
  useEffect(() => {
    if (active) {
      const stale = m.status === 'done' || m.status === 'error'
      if (!wasActiveRef.current && stale) m.reset()
      if (m.status === 'idle') {
        void m.openCamera()
        // 打开摄像头的同时播放魔镜引导音频（失败静默，不打断扫脸主流程
      }
    }
    wasActiveRef.current = active
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, m.status])

  // 离开场景：停采样、关摄像头、停引导音（stop 有 4s Worker 兜底，不阻塞切场景）；
  // 兜底上报最后快照（跳过/返回时 finishMirror 不会执行，父组件仍能拿到已采数据）
  useEffect(() => {
    if (!active) return
    return () => {
      void m.stop().then(reportMetrics)
      m.closeCamera()
      // 引导音已收收到 AudioEngine voice 单实例通道，离场时直接 stopVoice，
      // 保证不会拖到下一页与新场景的语音叠加。
      AudioEngine.stopVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // 模型就绪 → 开始 rPPG 采样。start() 会同步把 status 置为 recording，
  // 所以单独一个 effect 触发一次，不能和倒计时放一起（否则 status 变化会先跑 cleanup 清掉 interval）
  useEffect(() => {
    if (active && m.status === 'ready') {
      console.log('m.start()')
      m.start()
      AudioEngine.playVoice('/youyu/mirror.mp3')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, m.status])

  // 监控上报：rPPG Worker 每 1.5s 回传刷新 m.metrics，录制期间实时同步给父组件；
  // 收尾（done）后的最终值不走这里（status 已非 recording），由 finishMirror / cleanup 显式上报。
  // 独立 effect，不并入摄像头生命周期逻辑，避免搅动 status 相关时序
  useEffect(() => {
    if (active && m.status === 'recording') reportMetrics(m.metrics)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, m.status, m.metrics])

  // 采样中（recording）→ 倒计时；recording 期间 status 稳定，interval 不会被 deps 变化打断
  useEffect(() => {
    if (!active || m.status !== 'recording') return
    let s = MIRROR_SECONDS
    const id = window.setInterval(() => {
      s--
      setSec(Math.max(0, s))
      if (s <= 0) {
        window.clearInterval(id)
        finishMirror()
      }
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, m.status])
/*
  useEffect(() => {
    if (!active) return
    const bag = createTimerBag()
    setSec(MIRROR_SECONDS)
    setFallback(false)
    setWarn(false)
    setChips([])
    setChipsSent(false)

    const stopRec = () => {
      try { recRef.current?.stop() } catch { }
      recRef.current = null
    }
    
    // 环境提醒（不打断主线）
    ;[24, 48].forEach((at) => bag.later(() => {
      const w = MIRROR_WARNS[Math.floor(Math.random() * MIRROR_WARNS.length)]
      say('⚠ ' + w)
      setWarn(true)
      AudioEngine.blip(300, 0.25, 'triangle')
      bag.later(() => { setWarn(false); say('很好，继续看着镜子里的自己～') }, 3600)
    }, at * 1000))

    // 语音问答
    const SR = (window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor })
    const askQuestion = (i: number) => {
      if (i >= MIRROR_QA.length) return
      const qa = MIRROR_QA[i]
      const dur = speak(qa.q)
      say(qa.q)
      setChips(qa.chips)
      setChipsSent(false)
      let answered = false
      const t1 = bag.later(() => {
        if (answered) return
        speak('可以随便说点什么，或者我们继续下一个问题哦。')
        say('不着急，<b>随便说点什么</b>都行，或者我们继续 →')
      }, dur + 5000)
      const t2 = bag.later(() => { if (!answered) askQuestion(i + 1) }, dur + 13000)
      const doAnswer = () => {
        if (answered) return
        answered = true
        window.clearTimeout(t1)
        window.clearTimeout(t2)
        stopRec()
        say(MIRROR_ACK[Math.floor(Math.random() * MIRROR_ACK.length)])
        AudioEngine.blip(700, 0.15)
        bag.later(() => askQuestion(i + 1), 1200)
      }
      answerRef.current = doAnswer
      // 语音识别（支持时开启）
      bag.later(() => {
        const Ctor = SR.SpeechRecognition || SR.webkitSpeechRecognition
        if (!Ctor || answered) return
        try {
          const rec = new Ctor()
          recRef.current = rec
          rec.lang = 'zh-CN'
          rec.continuous = true
          rec.interimResults = true
          rec.onresult = (e) => {
            const t = e.results[e.results.length - 1][0].transcript
            if (t && t.trim()) doAnswer()
          }
          rec.onerror = () => {  }
          rec.start()
        } catch {  }
      }, Math.min(6000, dur + 300))
    }
    askQuestion(0)
    

    // rPPG 波形由 useMeasurement 的采集循环绘制到 #ppg-wave（真实脉搏波）

    return () => {
      bag.clear()
      stopRec()
      answerRef.current = null
    }
  }, [active])*/

  const sp = SPRITES[emo ?? 'happy']

  // 引导文案随倒计时切换：0-20s 深呼吸 / 20-40s 放松面部 / 40s 后默念肯定语
  const elapsed = MIRROR_SECONDS - sec
  const guideText =
    elapsed < 20
      ? '请你深深地注视自己的双眼，做3个深呼吸'
      : elapsed < 40
        ? '放松面部肌肉，松开牙关，舒展眉心'
        : '在心里默念3遍：我看见真实的自己，我值得美好'

  const pickChip = () => {
    setChipsSent(true)
    answerRef.current?.()
  }

  return (
    <section className={`scene${active ? ' active' : ''}`} id="scene-mirror">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="gate-bg" src={IMAGES.gate} alt="" />
      <div className={`mirror-center${warn ? ' warn' : ''}`}>
        {/* rPPG 扫脸：video 取景 + FaceMesh 检测叠框（overlay 与 video 同为 cover + 镜像，坐标系一致） */}
        <video id="mirror-video" ref={m.videoRef} autoPlay playsInline muted />
        <canvas id="mirror-overlay" className="mirror-overlay" ref={m.overlayRef} />
        {/* 门框镂空遮罩已移至 .mirror-center 之后的全屏层，见下方 mirror-gate */}

      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mirror-gate" src={IMAGES.gateTransparent} alt="" />
      
      <div className="mirror-dialogue">
        <div className="md-sprite" id="md-sprite" style={{ backgroundImage: `url(${sp.img})` }} />
        <div className="md-right">
          <div className="bubble">{guideText}</div>
        </div>
      </div>
      <div className="pulse-line"><canvas id="ppg-wave" ref={m.waveRef} /></div>
      <div className="mirror-face-hint">{m.faceHint} | 运行时间：<b id="mirror-sec">{sec}</b><i>s</i></div>
    </section>
  )
}
