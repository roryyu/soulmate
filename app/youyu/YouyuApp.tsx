'use client'

/**
 * 有屿 SOULMATES · 数字疗愈体验版 —— 主应用（流程编排）
 * 由原单页 HTML（有屿数字疗愈体验版.html）迁移、按场景拆分为多个 React 组件。
 *
 * 流程：宇宙开机(脑电采集) → 情绪精灵 → 魔镜秘境 → 声纹情绪 → 有屿世界 → 公园/博物馆(收集 12 枚音符)
 *      → 专属疗愈音乐 → 身心觉察报告
 *
 * 所有场景常驻挂载，通过 .active 类做淡入淡出切换（与原实现一致，保留过场动画）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import GlobalNav from './components/GlobalNav'
import MirrorScene from './components/MirrorScene'
import MusicScene from './components/MusicScene'
import PlaceScene from './components/PlaceScene'
import QuizModal from './components/QuizModal'
import ReportScene from './components/ReportScene'
import SplashScene from './components/SplashScene'
import SpriteScene from './components/SpriteScene'
import VoiceScene from './components/VoiceScene'
import Vortex from './components/Vortex'
import WorldScene from './components/WorldScene'
import { AudioEngine } from './lib/audio'
import { NOTE_GOAL, NOTE_GLYPHS, QUESTIONS, SPRITES } from './lib/data'
import { createTimerBag } from './lib/timers'
import type { ElemKey, Question, QuestionOption, SceneId, SpriteKey } from './lib/types'
import type { Metrics, ReportInsights } from '@/lib/types'

const INITIAL_ELEM: Record<ElemKey, number> = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 }

interface QuizTarget { id: string; el: HTMLElement }

export default function YouyuApp() {
  const phoneRef = useRef<HTMLDivElement | null>(null)
  const bagRef = useRef(createTimerBag())
  const deckRef = useRef<Question[]>([])
  const qiRef = useRef(0)
  const quizTargetRef = useRef<QuizTarget | null>(null)

  /* ---------- 全局状态（流程编排数据流，详见各注释） ---------- */

  /**
   * 当前场景 id —— 全部场景常驻挂载，由它驱动 active 类做淡入淡出切换。
   * 例：'scene-splash' → 'scene-sprite' → 'scene-mirror' → 'scene-voice' → 'scene-world'
   *     → 'scene-park' / 'scene-museum' → 'scene-music' → 'scene-report'
   */
  const [scene, setScene] = useState<SceneId>('scene-splash')

  /**
   * 开机页是否为「返回态」：从后续场景点返回时置 true，SplashScene 直接展示
   * 「已佩戴 · 信号优秀」并跳过 30s 脑电采集；首次开机为 false。
   */
  const [splashIdle, setSplashIdle] = useState(false)

  /**
   * 用户在精灵页选中的情绪精灵（五选一），null = 尚未选择（导航 skip 会兜底 'happy'）；
   * 下游 MirrorScene / WorldScene / MusicScene 消费它换皮。
   * 例：'happy' | 'sad' | 'angry' | 'anxious' | 'numb'
   */
  const [emo, setEmo] = useState<SpriteKey | null>(null)

  /**
   * 魔镜 rPPG 指标（MirrorScene 上报：录制中每 1.5s 快照 + 收尾最终值；供报告页消费）
   * 例：{ hr: 72, rr: 16, spo2: 98, rmssd: 38, lfhf: 1.8, si: 90, fi: 35, mwi: 40, confidence: 82, motion: 8 }
   */
  const [mirrorMetrics, setMirrorMetrics] = useState<Metrics | null>(null)

  /**
   * 声纹情绪判断结果（MusicScene 上报：用户在音乐场景录一段话，经 /api/example/voice
   * 识别后的文本；未录音/清空时为 null）。供报告页结合身心数据解读情绪状态。
   * 例：'{"role":"assistant","content":"最近有点累，想好好休息一下"}'
   */
  const [voiceResult, setVoiceResult] = useState<string | null>(null)

  /**
   * 已收集的音符 id 集合（形如 'park-0' / 'museum-2'），在公园/博物馆答对题后入集；
   * 集满 NOTE_GOAL（12）枚触发庆祝并转入音乐场景。
   * 例：new Set(['park-0', 'park-3', 'museum-2'])
   */
  const [notes, setNotes] = useState<Set<string>>(() => new Set())

  /**
   * 五行能量累计分：答题时按选项权重 opt.w 累加，取最大者为 dominantElem
   * 喂给 MusicScene 决定疗愈乐曲基调。
   * 例：{ wood: 1, fire: 3, earth: 2, metal: 1, water: 1 } → 主导五行为「火」
   */
  const [elem, setElem] = useState<Record<ElemKey, number>>(INITIAL_ELEM)

  /**
   * 报告洞察（大模型生成：ability/qa/moodBars/buffers）——进入报告页时由本组件
   * 请求一次 /api/report/insights，下发给 ReportScene；失败时报告页用兜底内容。
   */
  const [insights, setInsights] = useState<ReportInsights | null>(null)
  const insightsAskedRef = useRef(false)

  /** 场景穿越漩涡动画开关：vortexTo() 置 true，1300ms 后自动复位并落位新场景 */
  const [vortexOn, setVortexOn] = useState(false)

  /** 集齐 12 枚音符的庆祝横幅开关：置 true 后约 3.2s 自动复位 */
  const [celebrate, setCelebrate] = useState(false)

  /** 音符答题弹窗开关：点音符热区开（openQuiz），答题 900ms 后或点「稍后」自动关 */
  const [quizOpen, setQuizOpen] = useState(false)
  const [musicUrl, setMusicUrl] = useState<string | null>(null)
  const [musicLoading, setMusicLoading] = useState(false)
  /**
   * 弹窗当前题目（题库 QUESTIONS 洗牌后依次抽，见 ensureDeck）。
   * 例：{ t: '此刻的心情，更接近哪一种？', emo: 1, opts: [{ l: '明快、带劲', w: { fire: 2 } }, …] }
   */
  const [quizQuestion, setQuizQuestion] = useState<Question | null>(null)

  useEffect(() => () => bagRef.current.clear(), [])

  // 魔镜指标监控（调试期打印；正式消费方为报告页 insights）
  useEffect(() => {
    if (mirrorMetrics) console.info('[youyu] mirror metrics:', mirrorMetrics)
  }, [mirrorMetrics])

  // 声纹情绪判断结果监控（调试期打印；正式消费方为报告页）
  useEffect(() => {
    if (voiceResult) console.info('[youyu] voice result:', voiceResult)
  }, [voiceResult])

  /* ---------- 场景切换 / 穿越动效 ---------- */
  // 语音/引导音统一走 AudioEngine.playVoice 单实例通道，同一时间只会响一条。
  // 这里在跨场景的关键节点（vortex 起、导航 back/skip）额外 stopVoice 一下，
  // 避免上一场的引导音拖到漩涡动画里或下一页去。
  const vortexTo = useCallback((next: () => void) => {
    AudioEngine.stopVoice()
    setVortexOn(true)
    AudioEngine.chime(520)
    bagRef.current.later(() => { setVortexOn(false); next() }, 1300)
  }, [])

  const gotoSplashIdle = useCallback(() => { setSplashIdle(true); setScene('scene-splash') }, [])

  /* ---------- 各场景「自然完成」回调 ---------- */
  const onEegComplete = useCallback(() => vortexTo(() => { setSplashIdle(false); setScene('scene-sprite') }), [vortexTo])
  const onSpriteDone = useCallback(() => vortexTo(() => setScene('scene-mirror')), [vortexTo])
  const onMirrorDone = useCallback(() => vortexTo(() => setScene('scene-voice')), [vortexTo])
  const onVoiceDone = useCallback(() => vortexTo(() => setScene('scene-world')), [vortexTo])
  const onEnterPlace = useCallback((place: 'park' | 'museum') => setScene(('scene-' + place) as SceneId), [])
  const onMusicDone = useCallback(() => setScene('scene-report'), [])

  /* ---------- 导航：返回 / 跳过 ---------- */
  const nav: Record<SceneId, { back: (() => void) | null; skip: (() => void) | null }> = {
    'scene-splash': { back: null, skip: () => setScene('scene-sprite') },
    'scene-sprite': { back: gotoSplashIdle, skip: () => { setEmo((e) => e ?? 'happy'); setScene('scene-mirror') } },
    'scene-mirror': { back: () => setScene('scene-sprite'), skip: () => vortexTo(() => setScene('scene-voice')) },
    'scene-voice': { back: () => setScene('scene-mirror'), skip: () => vortexTo(() => setScene('scene-world')) },
    'scene-world': { back: () => setScene('scene-voice'), skip: () => setScene('scene-music') },
    'scene-park': { back: () => setScene('scene-world'), skip: () => setScene('scene-music') },
    'scene-museum': { back: () => setScene('scene-world'), skip: () => setScene('scene-music') },
    'scene-music': { back: () => setScene('scene-world'), skip: () => setScene('scene-report') },
    'scene-report': { back: null, skip: null },
  }
  const handleBack = () => { setQuizOpen(false); AudioEngine.stopVoice(); nav[scene].back?.() }
  const handleSkip = () => { setQuizOpen(false); AudioEngine.stopVoice(); nav[scene].skip?.() }

  /* ---------- 音符飞行动效（命令式，附着到 #phone 内以命中作用域样式） ---------- */
  const flyNote = (fromEl: HTMLElement) => {
    const host = phoneRef.current
    const tray = host?.querySelector<HTMLElement>('#note-tray')
    if (!host || !tray) return
    const fr = fromEl.getBoundingClientRect()
    const tr = tray.getBoundingClientRect()
    const fly = document.createElement('span')
    fly.className = 'fly-note'
    fly.textContent = NOTE_GLYPHS[Math.floor(Math.random() * 4)]
    fly.style.left = fr.left + 'px'
    fly.style.top = fr.top + 'px'
    fly.style.color = '#ffd98a'
    host.appendChild(fly)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fly.style.left = tr.left + tr.width / 2 + 'px'
      fly.style.top = tr.top + 10 + 'px'
      fly.style.transform = 'scale(.4) rotate(40deg)'
      fly.style.opacity = '.2'
    }))
    window.setTimeout(() => fly.remove(), 950)
  }

  /* ---------- 音符答题 ---------- */
  const ensureDeck = () => {
    if (qiRef.current >= deckRef.current.length) {
      deckRef.current = [...QUESTIONS].sort(() => Math.random() - 0.5)
      qiRef.current = 0
    }
  }
  const openQuiz = (noteId: string, el: HTMLElement) => {
    ensureDeck()
    const q = deckRef.current[qiRef.current++]
    quizTargetRef.current = { id: noteId, el }
    console.log('question',q)
    setQuizQuestion(q)
    setQuizOpen(true)
    AudioEngine.blip(880, 0.2)
  }
  const answerQuiz = (opt: QuestionOption, el: HTMLElement) => {
    setElem((prev) => {
      const n = { ...prev }
      ;(Object.entries(opt.w) as [ElemKey, number][]).forEach(([k, v]) => { n[k] = (n[k] || 0) + v })
      return n
    })
    AudioEngine.chime(660 + Math.random() * 220)
    flyNote(el)
    console.log('问卷答案',elem)
    const target = quizTargetRef.current
    const newNotes = new Set(notes)
    if (target) newNotes.add(target.id)
    setNotes(newNotes)

    bagRef.current.later(() => {
      setQuizOpen(false)
      if (newNotes.size >= NOTE_GOAL) {
        AudioEngine.stopAmbient()
        setCelebrate(true)
        AudioEngine.chime(520)
        bagRef.current.later(() => setCelebrate(false), 3200)
        bagRef.current.later(() => vortexTo(() => setScene('scene-music')), 1400)
      }
    }, 900)
  }

  const dominantElem = (Object.entries(elem).sort((a, b) => b[1] - a[1])[0][0]) as ElemKey
  const showTray = scene === 'scene-world' || scene === 'scene-park' || scene === 'scene-museum'

  // 报告洞察请求：进入报告页触发一次（魔镜指标为必传；五行/精灵/声纹作为附加上下文喂给大模型）
  useEffect(() => {
    if (scene !== 'scene-report' || insightsAskedRef.current || !mirrorMetrics) return
    insightsAskedRef.current = true
    fetch('/api/report/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: mirrorMetrics,
        extra: {
          自选情绪精灵: emo ? `${SPRITES[emo].name}（${SPRITES[emo].emo}）` : '未选择',
          五行能量: elem,
          主导五行: dominantElem,
          声纹识别文本: voiceResult || '未录音',
          收集音符数: notes.size,
        },
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => { if (data?.ok && data.insights) setInsights(data.insights) })
      .catch(() => {})
  }, [scene, mirrorMetrics, emo, elem, voiceResult, notes, dominantElem])

  const handleResultDone=()=>{
    
    const final: Metrics | null =mirrorMetrics;
     // 播放音乐
    const randomIndex = () => Math.floor(Math.random() * 2)
    const randomIndex2 = () => Math.floor(Math.random() * 4)
    const times=[
      {id:'t1',info:'8:00-12:00'},
      {id:'t2',info:'12:00-16:00'},
      {id:'t3',info:'16:00-20:00'},
      {id:'t4',info:'20:00-8:00'},
    ]
    //获取当前时分，根据times的info，返回id
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    let tid=times[0].id



    for (const t of times) {
      const [start, end] = t.info.split('-')
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em

      if (startMin <= endMin) {
        // 不跨午夜，如 8:00-12:00
        if (currentMinutes >= startMin && currentMinutes < endMin) tid=t.id
      } else {
        // 跨午夜，如 20:00-8:00
        if (currentMinutes >= startMin || currentMinutes < endMin) tid=t.id
      }
    }
    //自选情绪
    let eid='0030';
    if(emo){
      if(emo=='angry'){
        eid='0026';
      }
      if(emo=='sad'){
        eid=['0027','0028'][randomIndex()];
      }
      if(emo=='anxious'){
        eid='0029';
      }
      if(emo=='numb'){
        eid=['0031','0032'][randomIndex()];
      }
    }
    //量表
    const musicMap:Record<string,string[]>={
      '1':['0018','0019'],//deer
      '2':['0016','0017'],//bird
      '3':['0020','0021'],//bear
      '4':['0024','0025'],//dove
      '5':['0022','0023'],//fish
    }
    const volumes = elem
      ? [elem.wood, elem.fire, elem.earth, elem.metal, elem.water]
      : [0, 0, 0, 0, 0]
    const maxTrack = volumes.indexOf(Math.max(...volumes))
    const trackIndex=maxTrack+1;
    const mmid=musicMap[trackIndex][randomIndex()]
    let mid = '';
    if(final && final.si && final.si>70){
      let mm=['0003','0004'][randomIndex()];
      mid=`${mm}-0000-${mmid}-${eid}-${tid}`;
    }
    if(final && final.beats>80){
      let mm=['0001','0002'][randomIndex()];
      mid=`${mm}-0000-${mmid}-${eid}-${tid}`;
    }
    if(mid==''){
      let mm=['0005','0006','0007','0008'][randomIndex2()];
      mid=`${mm}-0000-${mmid}-${eid}-${tid}`;
    }
    console.log('final',final,mid)
    // 请求音乐生成接口（入参 mid，返回 OSS 播放地址；服务端有缓存会秒回）。
    // 不阻塞结果页：生成/混音可能耗时，先展示结果，音乐就绪后再出现播放器。
    setMusicUrl('');
    setMusicLoading(true);
    fetch('/api/music-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mid }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (data?.url) setMusicUrl(data.url);
      })
      .catch(() => {})
      .finally(() => setMusicLoading(false));
  }




  return (
    <div className="youyu-app" id="stage">
      <div id="phone" ref={phoneRef}>
        <GlobalNav
          showBack={!!nav[scene].back}
          showSkip={!!nav[scene].skip}
          onBack={handleBack}
          onSkip={handleSkip}
          showTray={showTray}
          noteCount={notes.size}
          goal={NOTE_GOAL}
        />

        <SplashScene active={scene === 'scene-splash'} idle={splashIdle} onEegComplete={onEegComplete} />
        <SpriteScene active={scene === 'scene-sprite'} onPick={setEmo} onDone={onSpriteDone} />
        <MirrorScene active={scene === 'scene-mirror'} emo={emo} onDone={onMirrorDone} onMetrics={setMirrorMetrics} />
        <VoiceScene active={scene === 'scene-voice'} onDone={onVoiceDone} onVoiceResult={setVoiceResult} />
        <WorldScene active={scene === 'scene-world'} emo={emo} onEnter={onEnterPlace} />
        <PlaceScene active={scene === 'scene-park'} place="park" collected={notes} onNoteClick={openQuiz} />
        <PlaceScene active={scene === 'scene-museum'} place="museum" collected={notes} onNoteClick={openQuiz} />
        <MusicScene active={scene === 'scene-music'} emo={emo} elemKey={dominantElem} onDone={onMusicDone} onRequestMusic={handleResultDone} musicUrl={musicUrl} />
        <ReportScene
          active={scene === 'scene-report'}
          metrics={mirrorMetrics}
          emo={emo}
          elem={elem}
          voiceResult={voiceResult}
          noteCount={notes.size}
          musicUrl={musicUrl}
          musicLoading={musicLoading}
          insights={insights}
        />

        {/* 集齐 12 枚音符的庆祝提示 */}
        {celebrate && (
          <div className="sprite-respond" style={{ left: 18, right: 18, bottom: 80, zIndex: 20, position: 'absolute' }}>
            <b>🎼 12 枚音符集齐！</b>你的身心数据已经足够谱写独一无二的疗愈乐曲，正在送往音乐圣殿…
          </div>
        )}

        <QuizModal
          open={quizOpen}
          question={quizQuestion}
          onAnswer={answerQuiz}
          onLater={() => setQuizOpen(false)}
        />

        <Vortex visible={vortexOn} />
      </div>
    </div>
  )
}
