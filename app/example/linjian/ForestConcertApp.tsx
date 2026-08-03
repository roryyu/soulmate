'use client'

/**
 * 林间音乐会 - 交互问卷主应用
 * 由原 Vite 构建产物 index-D-YXTryu.js 反编译改写为 TypeScript + React
 * 流程：开头视频 → 聆听指南 → 主线 12 题（每 3 题奖励过场）→ 支线选择
 *      → 支线 4 题（可跳过）→ 切换动画 → 90 秒放松基线采集 → 专属乐曲播放
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import gsap from 'gsap'
import {
  ChevronRight,
  LockKeyhole,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  ANIMALS,
  BRANCH_QUESTIONS,
  MAIN_QUESTIONS,
  RATING_OPTIONS,
  REWARD_VIDEOS,
  STORAGE_KEY,
  VIDEOS,
  MUSICS,
  buildPacket,
  createProgress,
  loadProgress,
  type Branch,
  type Phase,
  type Progress,
  type Question,
  type ResultPacket,
  type SaveStatus,
} from './lib'

/** 是否处于演示模式（URL 携带 ?demo，视频/倒计时均被缩短） */
function isDemoMode(): boolean {
  return new URLSearchParams(window.location.search).has('demo')
}

/**
 * 内容渐入动画 Hook：依赖变化时对容器子元素做上移淡入
 * 尊重系统"减少动态效果"设置
 */
function useRevealAnimation(dep: unknown) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const mm = gsap.matchMedia()
    mm.add(
      { reduceMotion: '(prefers-reduced-motion: reduce)' },
      ({ conditions }) => {
        if (conditions?.reduceMotion || !ref.current) return
        gsap.fromTo(
          ref.current.children,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.09,
            ease: 'power2.out',
            clearProps: 'transform,visibility',
          }
        )
      }
    )
    return () => mm.revert()
  }, [dep])
  return ref
}

/** 声音开关按钮 */
function SoundToggle({
  enabled,
  onChange,
  className = '',
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  className?: string
}) {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      onClick={() => onChange(!enabled)}
      aria-label={enabled ? '静音' : '开启声音'}
      title={enabled ? '静音' : '开启声音'}
    >
      {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}

/**
 * 全屏视频过场组件
 * 视频播完或到达 duration+1 秒兜底超时后触发 onComplete（视频缺失时也能继续流程）
 */
function VideoStage({
  src,
  onComplete,
  duration,
  title,
  subtitle,
  dark = false,
  audioEnabled,
  onAudioChange,
  requireStart = false,
}: {
  src: string
  onComplete: () => void
  duration: number
  title: string
  subtitle?: string
  dark?: boolean
  audioEnabled: boolean
  onAudioChange: (enabled: boolean) => void
  requireStart?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [started, setStarted] = useState(!requireStart)
  const completedRef = useRef(false)
  const demo = isDemoMode()

  // 兜底定时器：demo 模式最多 1.1 秒，正常模式为 duration+1 秒
  useEffect(() => {
    if (!started) return
    const timeout = demo ? Math.min(duration, 1.1) : duration + 1
    const timer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, timeout * 1000)
    return () => window.clearTimeout(timer)
  }, [duration, demo, onComplete, started])

  // 声音开关变化时同步 video 元素
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = !audioEnabled
      if (started) video.play().catch(() => {})
    }
  }, [audioEnabled, started])

  const handleEnded = () => {
    if (!completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }

  const handleStart = () => {
    const video = videoRef.current
    onAudioChange(true)
    setStarted(true)
    if (video) {
      video.muted = false
      video.volume = 1
      video.play().catch(() => {})
    }
  }

  const handleAudioChange = (enabled: boolean) => {
    const video = videoRef.current
    onAudioChange(enabled)
    if (video) {
      video.muted = !enabled
      if (enabled) video.play().catch(() => {})
    }
  }

  return (
    <main className={`video-stage ${dark ? 'dark' : ''}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={started}
        playsInline
        muted={!audioEnabled}
        preload="auto"
        onEnded={handleEnded}
      />
      <div className="video-vignette" />
      <div className="video-copy">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {started ? (
        <SoundToggle enabled={audioEnabled} onChange={handleAudioChange} className="sound-button" />
      ) : (
        <div className="video-start-gate">
          <button
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              minWidth: '150px',
            }}
            type="button"
            onClick={handleStart}
            aria-label="开启音乐会"
            title="开启音乐会"
          >
            <img
              src="/linjian/01_play_button.png"
              alt="开启音乐会"
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                display: 'block',
              }}
            />
          </button>
        </div>
      )}
    </main>
  )
}

/** 开头画面 */
function IntroScreen({
  onComplete,
  audioEnabled,
  onAudioChange,
}: {
  onComplete: () => void
  audioEnabled: boolean
  onAudioChange: (enabled: boolean) => void
}) {
  return (
    <VideoStage
      src={VIDEOS.intro}
      duration={10}
      onComplete={onComplete}
      title="林间音乐会"
      subtitle="循着一枚音符，听见此刻的自己"
      audioEnabled={audioEnabled}
      onAudioChange={onAudioChange}
      requireStart
    />
  )
}

/** 聆听指南（10 秒倒计时，可点击跳过） */
function GuideScreen({ onComplete }: { onComplete: () => void }) {
  const [countdown, setCountdown] = useState(10)
  const contentRef = useRevealAnimation('guide')
  const figuresRef = useRef<(HTMLElement | null)[]>([])
  const demo = isDemoMode()

  useEffect(() => {
    const startAt = Date.now()
    const total = demo ? 1000 : 10000
    const timer = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((total - (Date.now() - startAt)) / 1000))
      setCountdown(remain)
      if (remain === 0) onComplete()
    }, 200)
    return () => window.clearInterval(timer)
  }, [demo, onComplete])

  // 五位伙伴头像上下浮动动画
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tweens = figuresRef.current
        .filter((el): el is HTMLElement => Boolean(el))
        .map((el, i) =>
          gsap.to(el, {
            y: i % 2 === 0 ? -8 : 8,
            duration: 1.8 + i * 0.15,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          })
        )
      return () => tweens.forEach((tween) => tween.kill())
    })
    return () => mm.revert()
  }, [])

  return (
    <main
      className="guide-screen"
      onClick={onComplete}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onComplete()}
    >
      <div className="forest-overlay" />
      <div className="guide-content" ref={contentRef}>
        <div className="guide-topline">
          <span>聆听指南</span>
          <strong>{String(countdown).padStart(2, '0')}</strong>
        </div>
        <h1>
          请参考近两周
          <br />
          日常稳定的感受
        </h1>
        <p className="guide-lead">短期瞬时心情会影响专属乐曲贴合度</p>
        <div className="animal-ensemble" aria-label="五位森林伙伴">
          {Object.values(ANIMALS).map((animal, i) => (
            <figure
              key={animal.name}
              ref={(el) => {
                figuresRef.current[i] = el
              }}
            >
              <img src={animal.avatar} alt={animal.name} />
              <figcaption>{animal.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </main>
  )
}

/** 音符收集进度条 */
function ProgressRail({
  current,
  total,
  scores,
}: {
  current: number
  total: number
  scores: number[]
}) {
  return (
    <div className="progress-rail" aria-label={`已完成 ${scores.length} 题，共 ${total} 题`}>
      <div className="progress-label">
        <span>音符收集</span>
        <strong>
          {current + 1} / {total}
        </strong>
      </div>
      <div className="progress-notes">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < scores.length ? 'collected' : i === current ? 'current' : ''}>
            {i < scores.length ? '♪' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 答题确认后的音符爆发动画 */
function NoteBurst({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const notes = ref.current.children
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        notes,
        { autoAlpha: 0, y: -50, x: 0, rotation: 0, scale: 0.6 },
        {
          autoAlpha: 1,
          y: 260,
          x: (i: number) => (i - 5) * 22,
          rotation: (i: number) => (i % 2 ? 45 : -35),
          scale: 1,
          duration: 0.8,
          stagger: { each: 0.025, from: 'center' },
          ease: 'power1.in',
        }
      )
    })
    return () => mm.revert()
  }, [])
  return (
    <div className="note-burst" ref={ref}>
      {Array.from({ length: 11 }, (_, i) => (
        <i key={i} style={{ color }}>
          {i % 3 === 0 ? '♫' : '♪'}
        </i>
      ))}
    </div>
  )
}

/** 答题页（主线与支线共用） */
function QuestionScreen({
  question,
  index,
  total,
  scores,
  isBranch = false,
  onAnswer,
  onGoBack,
  audioEnabled,
  onAudioChange,
}: {
  question: Question
  index: number
  total: number
  scores: number[]
  isBranch?: boolean
  onAnswer: (score: number, seconds: number) => void
  onGoBack?: () => void
  audioEnabled: boolean
  onAudioChange: (enabled: boolean) => void
}) {
  const animal = ANIMALS[question.animal]
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showGentleDialog, setShowGentleDialog] = useState(false)
  // 检测在 0 与 10 两个极端间反复横跳（3 次触发温和提示弹窗）
  const flipRef = useRef<{ last: number | null; count: number }>({ last: null, count: 0 })
  const startTimeRef = useRef(performance.now())
  const contentRef = useRevealAnimation(question.id)

  // 切题时重置状态
  useEffect(() => {
    setSelected(null)
    setSubmitted(false)
    setShowGentleDialog(false)
    flipRef.current = { last: null, count: 0 }
    startTimeRef.current = performance.now()
  }, [question.id])

  const handleSelect = (score: number, e: MouseEvent<HTMLButtonElement>) => {
    if (submitted) return
    const last = flipRef.current.last
    if ((last === 0 && score === 10) || (last === 10 && score === 0)) {
      flipRef.current.count += 1
      if (flipRef.current.count >= 3) setShowGentleDialog(true)
    }
    flipRef.current.last = score
    setSelected(score)
    gsap.fromTo(
      e.currentTarget,
      { scale: 0.97 },
      { scale: 1, duration: 0.35, ease: 'back.out(1.8)', overwrite: 'auto' }
    )
  }

  const handleConfirm = () => {
    if (selected == null || submitted) return
    setSubmitted(true)
    const seconds = (performance.now() - startTimeRef.current) / 1000
    window.setTimeout(() => onAnswer(selected, seconds), 800)
  }

  return (
    <main
      className={`question-screen ${animal.className}`}
      style={{ '--accent': animal.color, '--scene': `url("${animal.scene}")` } as CSSProperties}
    >
      <div className="question-backdrop" />
      <header className="question-header">
        <div className="header-tools">
          <a style={{display:'none'}} href="/admin" className="icon-button admin-link" aria-label="后台管理" title="后台管理">
            <LockKeyhole size={18} />
          </a>
          <SoundToggle enabled={audioEnabled} onChange={onAudioChange} />
        </div>
        <div className="track-label">舒缓轨道 {question.track} 维度作答中</div>
      </header>
      <div className="question-content" ref={contentRef}>
        <ProgressRail current={index} total={total} scores={scores} />
        {isBranch ? <p className="branch-intro">森林小伙伴还有几句心里话想和你聊聊。</p> : null}
        <section className="animal-dialogue">
          <img className="question-avatar" src={animal.avatar} alt={animal.name} />
          <div className="speech-bubble">
            <span>
              {animal.name} · {question.id}
            </span>
            <h1>{question.text}</h1>
          </div>
        </section>
        <p className="rating-instruction">请参考近两周日常稳定状态打分，不只用当下一瞬间的心情判断</p>
        <div className="rating-grid">
          {RATING_OPTIONS.map((option, i) => (
            <button
              key={option.score}
              type="button"
              className={`rating-option ${selected === option.score ? 'selected' : ''}`}
              onClick={(e) => handleSelect(option.score, e)}
              disabled={submitted}
              aria-pressed={selected === option.score}
            >
              <span className="rating-star">{selected === option.score ? '★' : '☆'}</span>
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
              <em>{i + 1}</em>
            </button>
          ))}
        </div>
        <div className="question-actions">
          {onGoBack ? (
            <button
              className="text-button back-button"
              type="button"
              onClick={onGoBack}
              disabled={submitted || index === 0}
            >
              <ChevronRight
                size={18}
                style={{ transform: 'rotate(180deg)', marginRight: '4px' }}
              />
              上一题
            </button>
          ) : null}
          <button
            className="primary-button confirm-button"
            type="button"
            disabled={selected == null || submitted}
            onClick={handleConfirm}
          >
            <Music2 size={19} />
            {submitted ? '正在收集音符' : '确认共鸣'}
            {submitted ? null : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
      {submitted ? <NoteBurst color={animal.color} /> : null}
      {showGentleDialog ? (
        <div className="gentle-dialog" role="dialog" aria-modal="true">
          <div>
            <Music2 size={26} />
            <h2>先听听心里的声音</h2>
            <p>可以慢慢想一想自己平时的状态哦，不用着急选择。</p>
            <button type="button" onClick={() => setShowGentleDialog(false)}>
              我再想一想
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

/** 每答完 3 题的奖励过场 */
function RewardScreen({
  videoIndex,
  onComplete,
  audioEnabled,
  onAudioChange,
}: {
  videoIndex: number
  onComplete: () => void
  audioEnabled: boolean
  onAudioChange: (enabled: boolean) => void
}) {
  return (
    <VideoStage
      src={REWARD_VIDEOS[videoIndex]}
      duration={3}
      onComplete={onComplete}
      title={`已收集第 ${videoIndex + 1} 组林间和声`}
      subtitle="一枚新的音符正加入你的旋律"
      audioEnabled={audioEnabled}
      onAudioChange={onAudioChange}
    />
  )
}

/** 主线完成后的支线选择页 */
function BranchChoiceScreen({
  onChoose,
  audioEnabled,
  onAudioChange,
}: {
  onChoose: (branch: Branch) => void
  audioEnabled: boolean
  onAudioChange: (enabled: boolean) => void
}) {
  const contentRef = useRevealAnimation('branch-choice')
  return (
    <main className="choice-screen">
      <video src={VIDEOS.branchChoice} autoPlay muted={!audioEnabled} loop playsInline />
      <div className="choice-overlay" />
      <SoundToggle enabled={audioEnabled} onChange={onAudioChange} className="sound-button" />
      <section className="choice-content" ref={contentRef}>
        <div className="choice-mark">
          <Music2 size={34} />
        </div>
        <h1>
          全部林间音符
          <br />
          已经集齐
        </h1>
        <p>解锁隐藏小音符互动，愿意的话可以继续和小动物聊聊，直接跳过也能开启专属音乐会。</p>
        <div className="choice-actions">
          <button className="primary-button" type="button" onClick={() => onChoose('calibration')}>
            继续共鸣收集 <ChevronRight size={19} />
          </button>
          <button className="text-button" type="button" onClick={() => onChoose('direct')}>
            直接开启乐曲
          </button>
        </div>
      </section>
    </main>
  )
}

/** 90 秒放松基线采集页（demo 模式 3 秒） */
function CollectionScreen({ onComplete }: { onComplete: () => void }) {
  const total = isDemoMode() ? 3 : 90
  const [remaining, setRemaining] = useState(total)
  const screenRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const startAt = Date.now()
    const timer = window.setInterval(() => {
      const remain = Math.max(0, total - Math.floor((Date.now() - startAt) / 1000))
      setRemaining(remain)
      if (remain === 0) {
        window.clearInterval(timer)
        onComplete()
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [total, onComplete])

  // 漂浮音符动画
  useLayoutEffect(() => {
    if (!screenRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tween = gsap.to(screenRef.current!.querySelectorAll('i'), {
        y: -32,
        autoAlpha: 0.25,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
        ease: 'sine.inOut',
      })
      return () => tween.kill()
    })
    return () => mm.revert()
  }, [])

  return (
    <main className="collection-screen" ref={screenRef}>
      <div className="floating-notes">
        {['♪', '♫', '♪', '♩', '♫'].map((note, i) => (
          <i key={i}>{note}</i>
        ))}
      </div>
      <div className="collection-center">
        <span>放松基线采集中</span>
        <div
          className="countdown-ring"
          style={{ '--progress': `${(remaining / total) * 360}deg` } as CSSProperties}
        >
          <strong>{String(remaining).padStart(2, '0')}</strong>
          <small>秒</small>
        </div>
        <h1>保持安静，平稳呼吸</h1>
        <p>正在为你收集放松基线</p>
      </div>
      <div className="sensor-status">
        <span />
        眼罩硬件接口等待接入 · 当前使用纯问卷模式
      </div>
    </main>
  )
}

/** 专属乐曲播放页 */
function PlayerScreen({
  packet,
  saveStatus,
  onFinish,
  audioEnabled,
  onAudioChange,
}: {
  packet: ResultPacket
  saveStatus: SaveStatus
  onFinish: () => void
  audioEnabled: boolean
  onAudioChange: (enabled: boolean) => void
}) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const screenRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // 播放时缓慢推进进度条
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setProgress((p) => Math.min(100, p + 0.12)), 250)
    return () => window.clearInterval(timer)
  }, [playing])

  // 可视化频谱条动画
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const bars = screenRef.current?.querySelectorAll('.visualizer i')
      if (!bars) return
      const tween = gsap.to(bars, {
        scaleY: (i: number) => 0.35 + ((i * 7) % 10) / 10,
        duration: 0.65,
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.045, from: 'center' },
        ease: 'sine.inOut',
      })
      return () => tween.kill()
    })
    return () => mm.revert()
  }, [])

  const togglePlay = () => {
    const audio = videoRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    // 仅当音频未开启时才更新状态，避免不必要的重渲染
    if (!audioEnabled) {
      onAudioChange(true)
    }
    audio.volume = 1
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }

  const volumes = [packet.vol1, packet.vol2, packet.vol3, packet.vol4, packet.vol5]
  // 使用 useMemo 避免每次渲染重复计算
  const maxTrack = useMemo(
    () => volumes.indexOf(Math.max(...volumes)),
    [volumes]
  )
  const musicurl = MUSICS[String(maxTrack + 1) as keyof typeof MUSICS]
  return (
    <main className="player-screen" ref={screenRef}>
      <audio
      ref={videoRef}
      src={musicurl}
      ></audio>
      <video      
        src={VIDEOS.player}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="player-overlay" />
      <header>
        <span>林间音乐会</span>
        <a style={{display:'none'}}  href="/admin" className="icon-button" aria-label="后台管理" title="后台管理">
          <LockKeyhole size={18} />
        </a>
      </header>
      <section className="player-content">
        <p className="player-kicker">你的专属森林配方</p>
        <h1>{packet.base_tone}</h1>
        <div className={`visualizer ${playing ? 'active' : ''}`}>
          {Array.from({ length: 26 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="track-mix">
          {volumes.map((vol, i) => (
            <div key={i}>
              <span>轨道 {i + 1}</span>
              <i>
                <b style={{ width: `${vol * 100}%` }} />
              </i>
              <strong>{Math.round(vol * 100)}%</strong>
            </div>
          ))}
        </div>
        <div className="player-controls">
          <button
            className="play-button"
            type="button"
            onClick={togglePlay}
            aria-label={playing ? '暂停' : '播放'}
            title={playing ? '暂停' : '播放'}
          >
            {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>
          <div className="player-progress">
            <span>
              <i style={{ width: `${progress}%` }} />
            </span>
          </div>
          <SoundToggle enabled={audioEnabled} onChange={onAudioChange} className="player-sound-button" />
        </div>
        <button className="finish-button" type="button" onClick={onFinish}>
          <RotateCcw size={17} />
          完成本次体验
        </button>
        <p className={`save-status ${saveStatus}`}>
          {saveStatus === 'saved'
            ? '本次答题结果已安全存入后台'
            : saveStatus === 'error'
              ? '结果暂存于本机，服务恢复后可再次提交'
              : '正在保存本次答题结果'}
        </p>
      </section>
      <footer>本次互动数据仅用于本次乐曲调配，播放结束自动清空本地数据。</footer>
    </main>
  )
}

/** 主应用：管理整个流程状态机与进度持久化 */
export default function ForestConcertApp() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [rewardIndex, setRewardIndex] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saving')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const handleAudioChange = useCallback((enabled: boolean) => setAudioEnabled(enabled), [])

  // 进度变更即持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  // 主线作答总时长（仅统计前 12 题）
  const mainTotalTime = useMemo(
    () => progress.answerTimes.slice(0, 12).reduce((sum, t) => sum + t, 0),
    [progress.answerTimes]
  )

  // 主线答完 12 题后生成结果数据包
  const packet = useMemo(() => {
    if (progress.qScores.length !== 12) return null
    const branchScores = progress.tScores.length === 4 ? progress.tScores : []
    return buildPacket(progress.qScores, branchScores, mainTotalTime)
  }, [progress.qScores, progress.tScores, mainTotalTime])

  // 进入播放页后上报答题结果
  useEffect(() => {
    if (progress.phase !== 'player' || !packet) return
    const controller = new AbortController()
    setSaveStatus('saved')
    /*setSaveStatus('saving')
    fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: progress.sessionId,
        createdAt: progress.createdAt,
        completedAt: new Date().toISOString(),
        branch: progress.branch,
        answerTimes: progress.answerTimes,
        packet,
      }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('保存失败')
        setSaveStatus('saved')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setSaveStatus('error')
      })*/
    return () => controller.abort()
  }, [packet, progress.answerTimes, progress.branch, progress.createdAt, progress.phase, progress.sessionId])

  const setPhase = (phase: Phase) => setProgress((p) => ({ ...p, phase }))

  /** 主线答题：每 3 题插入奖励过场，12 题后进入支线选择 */
  const handleMainAnswer = (score: number, seconds: number) => {
    setProgress((p) => {
      const qScores = [...p.qScores, score]
      const answerTimes = [...p.answerTimes, Number(seconds.toFixed(2))]
      const count = qScores.length
      if ([3, 6, 9].includes(count)) {
        setRewardIndex(count / 3 - 1)
        return { ...p, qScores, answerTimes }
      }
      if (count === 12) {
        return { ...p, qScores, answerTimes, phase: 'branch-choice' }
      }
      return { ...p, qScores, answerTimes, mainIndex: p.mainIndex + 1 }
    })
  }

  /** 奖励过场结束，继续下一题 */
  const handleRewardComplete = () => {
    setRewardIndex(null)
    setProgress((p) => ({ ...p, mainIndex: p.mainIndex + 1 }))
  }

  /** 支线选择 */
  const handleBranchChoose = (branch: Branch) => {
    setProgress((p) => ({
      ...p,
      branch,
      phase: branch === 'calibration' ? 'branch' : 'transition',
    }))
  }

  /** 支线答题：4 题答完进入切换动画 */
  const handleBranchAnswer = (score: number, seconds: number) => {
    setProgress((p) => {
      const tScores = [...p.tScores, score]
      const answerTimes = [...p.answerTimes, Number(seconds.toFixed(2))]
      if (tScores.length === 4) {
        return { ...p, tScores, answerTimes, phase: 'transition' }
      }
      return { ...p, tScores, answerTimes, branchIndex: p.branchIndex + 1 }
    })
  }

  /** 主线答题：回到上一题 */
  const handleMainGoBack = () => {
    setProgress((p) => {
      if (p.mainIndex === 0 || p.qScores.length === 0) return p
      const qScores = p.qScores.slice(0, -1)
      const answerTimes = p.answerTimes.slice(0, -1)
      const mainIndex = p.mainIndex - 1
      // 如果回到奖励过场前的题目
      if ([3, 6, 9].includes(qScores.length + 1)) {
        setRewardIndex(null)
      }
      return { ...p, qScores, answerTimes, mainIndex }
    })
  }

  /** 支线答题：回到上一题 */
  const handleBranchGoBack = () => {
    setProgress((p) => {
      if (p.branchIndex === 0 || p.tScores.length === 0) return p
      const tScores = p.tScores.slice(0, -1)
      const answerTimes = p.answerTimes.slice(0, -1)
      const branchIndex = p.branchIndex - 1
      return { ...p, tScores, answerTimes, branchIndex }
    })
  }

  /** 完成体验：清空本地数据并重新开始 */
  const handleFinish = () => {
    localStorage.removeItem(STORAGE_KEY)
    setProgress(createProgress())
  }

  let screen: JSX.Element | null
  if (rewardIndex != null) {
    screen = (
      <RewardScreen
        videoIndex={rewardIndex}
        onComplete={handleRewardComplete}
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else if (progress.phase === 'intro') {
    screen = (
      <IntroScreen
        onComplete={() => setPhase('guide')}
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else if (progress.phase === 'guide') {
    screen = <GuideScreen onComplete={() => setPhase('quiz')} />
  } else if (progress.phase === 'quiz') {
    screen = (
      <QuestionScreen
        question={MAIN_QUESTIONS[progress.mainIndex]}
        index={progress.mainIndex}
        total={12}
        scores={progress.qScores}
        onAnswer={handleMainAnswer}
        onGoBack={handleMainGoBack}
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else if (progress.phase === 'branch-choice') {
    screen = (
      <BranchChoiceScreen
        onChoose={handleBranchChoose}
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else if (progress.phase === 'branch') {
    screen = (
      <QuestionScreen
        question={BRANCH_QUESTIONS[progress.branchIndex]}
        index={progress.branchIndex}
        total={4}
        scores={progress.tScores}
        isBranch
        onAnswer={handleBranchAnswer}
        onGoBack={handleBranchGoBack}
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else if (progress.phase === 'transition') {
    screen = (
      <VideoStage
        src={VIDEOS.transition}
        duration={5}
        onComplete={() => setPhase('collect')}
        title="让呼吸慢慢安静下来"
        subtitle="准备开始 90 秒身心节奏采集"
        dark
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else if (progress.phase === 'collect') {
    screen = <CollectionScreen onComplete={() => setPhase('player')} />
  } else if (progress.phase === 'player' && packet) {
    screen = (
      <PlayerScreen
        packet={packet}
        saveStatus={saveStatus}
        onFinish={handleFinish}
        audioEnabled={audioEnabled}
        onAudioChange={handleAudioChange}
      />
    )
  } else {
    screen = null
  }

  return <div className="linjian-app">{screen}</div>
}
