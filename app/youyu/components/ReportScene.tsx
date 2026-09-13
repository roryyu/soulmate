'use client'

/**
 * 场景 7：有屿身心觉察报告（长页，可上下滑动）
 * 视觉还原 public/youyu/report.jpg 长图（深空底 + 卡片 + 青色章节条），
 * 内容结构参考 components/metrics/ResultScreen.tsx：
 * 封面 → 摘要 → 重点提示 → 情绪流动(雷达) → 身心详解 → 五行运行模式 →
 * 情绪能力 → 疗愈反馈 → 自我觉察 → 长期追踪 → 行动建议 → 品牌尾页。
 * 数据全部来自 YouyuApp 全局 state（魔镜指标 / 五行能量 / 精灵 / 声纹 / 音乐），
 * 大模型动态内容（insights）由 YouyuApp 请求 /api/report/insights 后下发。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Metrics, ReportInsights } from '@/lib/types'
import { SPRITES } from '../lib/data'
import {
  DIM_DEFS, ELEM_ARCHETYPE, ELEM_META, ELEM_ORDER, FALLBACK_BUFFERS, FALLBACK_QA,
  appendTrend, badgeOf, dateStr, elemValues, emoDims, fallbackAbility, fallbackMoodBars,
  fmt, levelOf, rangeBadge, reportNo, type TrendPoint,
} from '../lib/report'
import type { ElemKey, SpriteKey } from '../lib/types'

interface Props {
  active: boolean
  /** 魔镜 rPPG 实测指标（跳过魔镜时为 null，报告用兜底值） */
  metrics: Metrics | null
  /** 用户自选情绪精灵 */
  emo: SpriteKey | null
  /** 五行能量累计分（音符答题累加） */
  elem: Record<ElemKey, number>
  /** 声纹情绪判断识别文本 */
  voiceResult: string | null
  /** 已收集音符数 */
  noteCount: number
  musicUrl: string | null
  musicLoading: boolean
  /** 大模型生成的报告动态内容（YouyuApp 请求） */
  insights: ReportInsights | null
}

/* ---------- 通用小块 ---------- */

/** 章节分隔线 + 青色竖条标题（还原长图排版） */
function Sec({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <>
      <div className="yyr-div" aria-hidden><i /><span>有屿Soulmates</span><i /></div>
      <h2 className="yyr-sec-title">{title}</h2>
      {lead && <p className="yyr-lead">{lead}</p>}
      {children}
    </>
  )
}

/** 横向条形图行：标签 + 轨道 + 数值 */
function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="yyr-bar-row">
      <span className="yyr-bar-label">{label}</span>
      <div className="yyr-bar-track"><div style={{ width: `${Math.min(100, Math.max(2, value))}%`, background: color }} /></div>
      <b className="yyr-bar-val">{Math.round(value)}</b>
    </div>
  )
}

/** 六维情绪雷达（青色六边形，顶点顺序与 DIM_DEFS 一致） */
function HexRadar({ values }: { values: number[] }) {
  const size = 250
  const c = size / 2
  const r = size / 2 - 40
  const pt = (i: number, ratio: number): [number, number] => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2
    return [c + Math.cos(a) * r * ratio, c + Math.sin(a) * r * ratio]
  }
  const ring = (ratio: number) => Array.from({ length: 6 }, (_, i) => pt(i, ratio).join(',')).join(' ')
  const data = values.map((v, i) => pt(i, Math.min(1, Math.max(0.06, v / 100))).join(',')).join(' ')
  return (
    <svg className="yyr-hex" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {[0.33, 0.66, 1].map((k) => <polygon key={k} points={ring(k)} className="yyr-hex-grid" />)}
      {Array.from({ length: 6 }, (_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="yyr-hex-axis" />
      })}
      <polygon points={data} className="yyr-hex-data" />
      {values.map((v, i) => {
        const [x, y] = pt(i, Math.min(1, Math.max(0.06, v / 100)))
        return <circle key={i} cx={x} cy={y} r={4} className="yyr-hex-dot" />
      })}
      {DIM_DEFS.map((d, i) => {
        const [x, y] = pt(i, 1.24)
        return (
          <text key={d.key} x={x} y={y + 4} textAnchor="middle" className="yyr-hex-label">{d.label}</text>
        )
      })}
    </svg>
  )
}

/** 五行雷达（绿色五边形，顶点颜色随五行） */
function PentRadar({ values }: { values: number[] }) {
  const size = 210
  const c = size / 2
  const r = size / 2 - 34
  const pt = (i: number, ratio: number): [number, number] => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
    return [c + Math.cos(a) * r * ratio, c + Math.sin(a) * r * ratio]
  }
  const ring = (ratio: number) => Array.from({ length: 5 }, (_, i) => pt(i, ratio).join(',')).join(' ')
  const data = values.map((v, i) => pt(i, Math.min(1, Math.max(0.08, v / 100))).join(',')).join(' ')
  return (
    <svg className="yyr-pent" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {[0.33, 0.66, 1].map((k) => <polygon key={k} points={ring(k)} className="yyr-pent-grid" />)}
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="yyr-pent-axis" />
      })}
      <polygon points={data} className="yyr-pent-data" />
      {values.map((v, i) => {
        const [x, y] = pt(i, Math.min(1, Math.max(0.08, v / 100)))
        return <circle key={i} cx={x} cy={y} r={3.5} fill={ELEM_META[ELEM_ORDER[i]].color} />
      })}
      {ELEM_ORDER.map((k, i) => {
        const [x, y] = pt(i, 1.26)
        return (
          <text key={k} x={x} y={y + 4} textAnchor="middle" className="yyr-pent-label" style={{ fill: ELEM_META[k].color }}>
            {ELEM_META[k].label}
          </text>
        )
      })}
    </svg>
  )
}

/** 长期状态追踪折线图（最多 5 次记录） */
function TrendChart({ points }: { points: TrendPoint[] }) {
  const W = 320
  const H = 190
  const padL = 30
  const padR = 14
  const padT = 12
  const padB = 26
  const n = points.length
  const x = (i: number) => (n <= 1 ? (W - padL - padR) / 2 + padL : padL + (i * (W - padL - padR)) / (n - 1))
  const y = (v: number) => padT + ((100 - v) / 100) * (H - padT - padB)
  const series: { key: keyof Omit<TrendPoint, 't'>; color: string; label: string }[] = [
    { key: 'tension', color: '#f2986b', label: '紧张度' },
    { key: 'relax', color: '#22d3ee', label: '放松度' },
    { key: 'stress', color: '#e9c548', label: '压力值' },
    { key: 'sleep', color: '#5ec26a', label: '睡眠质量' },
  ]
  return (
    <div className="yyr-trend">
      <div className="yyr-trend-legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="yyr-trend-svg" aria-hidden>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="yyr-trend-grid" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className="yyr-trend-axis">{v}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            {n > 1 && (
              <polyline
                points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')}
                fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round"
              />
            )}
            {points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p[s.key])} r={3.2} fill={s.color} />
            ))}
          </g>
        ))}
        {points.map((_, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="yyr-trend-axis">第{i + 1}次</text>
        ))}
      </svg>
      {n < 2 && <p className="yyr-tip">基线建立中：完成第 2 次体验后，曲线将开始连接你的状态变化。</p>}
    </div>
  )
}

/* ---------- 主组件 ---------- */

export default function ReportScene({
  active, metrics, emo, elem, voiceResult, noteCount, musicUrl, musicLoading, insights,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const trendRef = useRef(false)

  const dims = useMemo(() => emoDims(metrics), [metrics])
  const eVals = useMemo(() => elemValues(elem), [elem])
  const domKey = ELEM_ORDER[eVals.indexOf(Math.max(...eVals))]
  const em = ELEM_META[domKey]
  const sp = SPRITES[emo ?? 'happy']

  // 大模型动态内容优先，未返回时用六维换算兜底
  const ability = insights?.ability?.length ? insights.ability : fallbackAbility(dims)
  const moodBars = insights?.moodBars?.length ? insights.moodBars : fallbackMoodBars(dims)
  const qa = insights?.qa?.length ? insights.qa : FALLBACK_QA
  const buffers = insights?.buffers?.length ? insights.buffers : FALLBACK_BUFFERS

  // 疗愈反馈等级与介入强度（按放松/愉悦换算）
  const feedback = dims.relax >= 55 && dims.tension <= 55 ? '明显舒缓' : dims.tension <= 65 ? '温和放松' : '初步平静'
  const curePct = Math.round((dims.relax + dims.pleasure) / 2)

  useEffect(() => {
    if (active && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [active])

  // 进入报告页记录一次长期追踪快照（localStorage，1 分钟内重复进入视为同一次）
  useEffect(() => {
    if (!active || trendRef.current) return
    trendRef.current = true
    setTrend(appendTrend({ t: Date.now(), tension: dims.tension, relax: dims.relax, stress: dims.stress, sleep: dims.sleep }))
  }, [active, dims])

  const no = reportNo(`${emo ?? 'anon'}-${noteCount}-${metrics?.beats ?? 0}`)

  // 保存报告：html-to-image 把 .yyr 长页节点导出为 PNG 下载（动态导入，不影响首屏包体积）
  const handleSave = async () => {
    const node = bodyRef.current
    if (saving || saved || !node) return
    setSaving(true)
    setSaveError(false)
    try {
      const { toPng } = await import('html-to-image')
      // 长页约 7000px，2 倍图可能超浏览器 canvas 尺寸上限，超限降为 1 倍
      const pixelRatio = node.offsetHeight * 2 > 16000 ? 1 : 2
      const dataUrl = await toPng(node, { pixelRatio, backgroundColor: '#070d1c', cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `有屿身心觉察报告-${dateStr().replace(/\//g, '-')}.png`
      a.click()
      setSaved(true)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }
  const tLevel = levelOf(dims.tension)
  const sLevel = levelOf(dims.stress)
  const slLevel = levelOf(dims.sleep)

  // 身心状态详解卡（2 列 + 3 列）；实测指标按正常区间判偏离：心率 60-100 / 呼吸 12-20 / 血氧 95-100
  const details2 = [
    { label: '心率', badge: rangeBadge(metrics?.hr, 60, 100), value: `${fmt(metrics?.hr)}bpm`, desc: '每分钟心跳次数，静息正常约60-100' },
    {
      label: '呼吸', badge: rangeBadge(metrics?.rr, 12, 20), value: `${fmt(metrics?.rr)}/分钟`,
      desc: (metrics?.rr ?? 16) < 12
        ? '呼吸频率低于本次基线，提示身体可能处于抑制或疲劳恢复状态，建议通过深呼吸逐步调节。'
        : (metrics?.rr ?? 16) > 20
          ? '呼吸频率偏快，多与紧张或亢奋有关，可尝试延长呼气把节奏慢下来。'
          : '呼吸频率处于平稳区间，是身心能够放松下来的基础信号。',
    },
    { label: '血氧', badge: rangeBadge(metrics?.spo2, 95, 100), value: fmt(metrics?.spo2), desc: '血液氧饱和度，正常应≥95%' },
    {
      label: '紧张度', badge: badgeOf(dims.tension), value: String(dims.tension),
      desc: dims.tension >= 60
        ? '你的交感神经系统活跃度较高，身体处于「待命」状态，这通常与近期压力或长期紧绷有关。'
        : '你的交感神经活跃度处于温和区间，身体没有长期停留在「待命」状态。',
    },
    {
      label: '放松度', badge: badgeOf(dims.relax), value: String(dims.relax),
      desc: '身心从紧张状态中恢复松弛的能力。放松度偏低时，容易持续感到紧绷、难以卸下压力，是本次调节需重点提升的维度。',
    },
    {
      label: '压力值', badge: badgeOf(dims.stress), value: String(dims.stress),
      desc: '综合评估你近期的心理负荷水平。压力值偏低提示身心负荷相对轻松，但需关注是否伴随动力不足或情绪抑制。',
    },
  ]
  const details3 = [
    {
      label: '愉悦度', badge: badgeOf(dims.pleasure), value: String(dims.pleasure),
      desc: '正向情绪与满足感的体验强度。愉悦度均衡代表情绪基调总体平稳，仍有提升空间以增进整体幸福感。',
    },
    {
      label: '焦虑度', badge: badgeOf(dims.anxiety), value: String(dims.anxiety),
      desc: '对不确定性的担忧与紧张体验。焦虑度偏高时，常伴随反复思虑、注意力难以安定等身心反应。',
    },
    {
      label: '睡眠', badge: badgeOf(dims.sleep), value: String(dims.sleep),
      desc: '睡眠的深度与身心恢复质量。睡眠质量一般提示休息尚未充分修复状态，建议结合放松训练逐步改善。',
    },
  ]

  return (
    <section className={`scene report${active ? ' active' : ''}`} id="scene-report">
      <div className="report-scroll" id="report-scroll" ref={scrollRef}>
        <div className="yyr" ref={bodyRef}>
          {/* ── 封面 ── */}
          <header className="yyr-cover">
            <p className="yyr-cover-label">有屿Soulmates · 身心觉察报告</p>
            <h1 className="yyr-cover-title">你看得见你的情绪吗?</h1>
            <p className="yyr-cover-can">我能</p>
            <p className="yyr-cover-lines">不猜测情绪<br />而是精准「看见」<br />并执行专属于你的调节方案</p>
            <p className="yyr-cover-strong">此刻起<br />做情绪的主人</p>
            <div className="yyr-cover-deco" aria-hidden>
              <span className="yyr-deco-note n1">♪</span>
              <span className="yyr-deco-note n2">♩</span>
              <span className="yyr-deco-dot d1" />
              <span className="yyr-deco-dot d2" />
              <span className="yyr-deco-star s1">✦</span>
              <span className="yyr-deco-star s2">✦</span>
              <span className="yyr-deco-star s3">✦</span>
              <span className="yyr-deco-star s4">✦</span>
              <span className="yyr-deco-star s5">✦</span>
            </div>
          </header>

          {/* ── 报告信息 ── */}
          <div className="yyr-meta">
            <div className="yyr-meta-row">
              <span>报告编号 {no}</span>
              <span>检测日期 {dateStr()}</span>
            </div>
            <div className="yyr-meta-row three">
              <span>情绪精灵 {sp.name}·{sp.emo}</span>
              <span>主导五行 {em.label}</span>
              <span>音符 {noteCount}/12</span>
            </div>
          </div>

          {/* ── 本期疗愈音乐 ── */}
          <section className="yyr-card yyr-music">
            <h3 className="yyr-card-title">本期疗愈音乐</h3>
            <div className={`yyr-viz${playing ? ' on' : ''}`} aria-hidden>
              {Array.from({ length: 26 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.06}s` }} />)}
            </div>
            {musicLoading && <p className="yyr-tip">正在为你生成专属音乐…</p>}
            {musicUrl ? (
              <audio
                controls
                src={musicUrl}
                className="yyr-audio"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            ) : (
              !musicLoading && <p className="yyr-tip">音乐将稍后推送至你的报告。</p>
            )}
          </section>

          {/* ── 你的情绪「体检」摘要 ── */}
          <Sec title="你的情绪「体检」摘要">
            <div className="yyr-card yyr-hero">
              <span className="yyr-hero-circle" style={{ background: em.color }}>{em.label}</span>
              <div>
                <small>主导体质类型</small>
                <b>{em.label} · {em.title}</b>
              </div>
            </div>
            <p className="yyr-lead">
              你当前的情绪底色偏「{dims.tension > dims.relax ? '紧' : '缓'}」——思虑较多、内在节奏快，身体可能已经先于意识发出了信号。
              {em.label}型人容易在压力下出现焦虑、失眠、肩颈紧绷等表现。
              <br />
              {em.label}型的情绪健康关键在于「{em.practice.slice(0, 1)}」——给予情绪适当出口与节奏感，而非压抑或加速。
            </p>
            <div className="yyr-pills">
              <span className={`yyr-pill ${tLevel.tone}`}>身心紧绷 {tLevel.text}</span>
              <span className={`yyr-pill ${sLevel.tone}`}>压力负荷 {sLevel.text}</span>
              <span className={`yyr-pill ${slLevel.tone}`}>睡眠质量 {slLevel.text}</span>
            </div>
            <div className="yyr-mini4">
              {[
                { label: '放松度', v: dims.relax },
                { label: '愉悦度', v: dims.pleasure },
                { label: '紧张度', v: dims.tension },
                { label: '焦虑度', v: dims.anxiety },
              ].map((it) => {
                const lv = levelOf(it.v)
                return (
                  <div className="yyr-mini" key={it.label}>
                    <span>{it.label}</span>
                    <b className={lv.tone}>{lv.text}</b>
                  </div>
                )
              })}
            </div>
          </Sec>

          {/* ── 重点提示 ── */}
          <section className="yyr-card yyr-note">
            <div className="yyr-div" aria-hidden><i /><span>有屿Soulmates</span><i /></div>
            <h3 className="yyr-bar-title orange">重点提示</h3>
            <p className="yyr-note-p">
              你的「紧张-放松」比例{dims.tension > dims.relax ? '失衡' : '基本平衡'}。
              <br />
              检测显示放松度{levelOf(dims.relax).text.replace(' ↑', '').replace(' ↓', '')}，而紧张度{levelOf(dims.tension).text.replace(' ↑', '').replace(' ↓', '')}。
            </p>
            <p className="yyr-cyan-line">本次干预方向：{em.practice}与安抚并重</p>
            <p className="yyr-note-p">
              基于你当前的情绪数据，音乐干预将以帮助你从「绷着」过渡到「放下」为核心。
            </p>
          </section>

          {/* ── 你的情绪正在怎样流动? ── */}
          <Sec title="你的情绪正在怎样流动?">
            <div className="yyr-stat3">
              <div><small>心率</small><b>{fmt(metrics?.hr)}bpm</b></div>
              <div><small>呼吸</small><b>{fmt(metrics?.rr)}/分钟</b></div>
              <div><small>血氧</small><b>{fmt(metrics?.spo2)}</b></div>
            </div>
            <div className="yyr-card">
              <div className="yyr-card-head">
                <b>情绪维度雷达图</b>
                <small>核心维度评分</small>
              </div>
              <HexRadar values={DIM_DEFS.map((d) => dims[d.key])} />
              <div className="yyr-bars">
                {DIM_DEFS.map((d) => (
                  <BarRow key={d.key} label={d.label} value={dims[d.key]} color={d.color} />
                ))}
              </div>
            </div>
          </Sec>

          {/* ── 身心状态详解 ── */}
          <Sec title="身心状态详解">
            <div className="yyr-grid2">
              {details2.map((d) => (
                <div className="yyr-detail" key={d.label}>
                  <div className="yyr-detail-head">
                    <span>{d.label}</span>
                    <em className={`yyr-badge ${d.badge.tone}`}>{d.badge.text}</em>
                  </div>
                  <b>{d.value}</b>
                  <p>{d.desc}</p>
                </div>
              ))}
            </div>
            <div className="yyr-grid3">
              {details3.map((d) => (
                <div className="yyr-detail" key={d.label}>
                  <div className="yyr-detail-head">
                    <span>{d.label}</span>
                    <em className={`yyr-badge ${d.badge.tone}`}>{d.badge.text}</em>
                  </div>
                  <b>{d.value}</b>
                  <p>{d.desc}</p>
                </div>
              ))}
            </div>
          </Sec>

          {/* ── 你的身心运行模式 ── */}
          <Sec
            title="你的身心运行模式"
            lead={`五行是一种理解你情绪规律的视角，并非非此即彼。您的主导倾向是${em.label}，但火、土、金、水的能量同样在您体内流动，共同构成完整的您。`}
          >
            <div className="yyr-card yyr-mode">
              <PentRadar values={eVals} />
              <div className="yyr-mode-info">
                <div className="yyr-mode-row">
                  <span className="yyr-mode-badge" style={{ background: em.color }}>{em.label}</span>
                  <div>
                    <b>{em.title}</b>
                    <p>{em.desc}</p>
                  </div>
                </div>
                <div className="yyr-mode-row">
                  <span className="yyr-mode-badge dim">情</span>
                  <div>
                    <b>情绪关键词</b>
                    <p>{em.keywords}<br />本次自选精灵：{sp.name}（{sp.emo}）</p>
                  </div>
                </div>
              </div>
            </div>
          </Sec>

          {/* ── 情绪能力分析 ── */}
          <Sec title="情绪能力分析">
            <div className="yyr-card">
              <p className="yyr-ability-cap">你的情绪能力类型</p>
              <p className="yyr-ability-type">{ELEM_ARCHETYPE[domKey]}</p>
              <div className="yyr-bars">
                {ability.map((a) => (
                  <BarRow key={a.label} label={a.label} value={a.value} color={a.color} />
                ))}
              </div>
              <p className="yyr-foot-note">
                以上能力分值反映当前状态而非固定特质。
                <br />
                随着持续追踪，你的情绪能力画像将逐步呈现更稳定的个人特征。
              </p>
            </div>
          </Sec>

          {/* ── 本次数字疗愈过程 ── */}
          <Sec
            title="本次数字疗愈过程，你的身体感受到了什么?"
            lead="我们不过度强调数字变化，更关注你真实的身心体验与调节方向。"
          >
            <div className="yyr-card yyr-feedback">
              <span className="yyr-feedback-circle">
                <b>{feedback}</b>
                <small>本次反馈</small>
              </span>
              <div>
                <p>
                  本次干预过程，你的呼吸{dims.relax >= 50 ? '变深' : '趋于平稳'}、思绪{dims.tension <= 55 ? '减缓' : '开始减速'}，身体从紧绷状态逐步转向松弛。
                </p>
                <p>
                  身心数据呈现出紧张度{dims.tension <= 55 ? '下降' : '回落'}、放松度{dims.relax >= 50 ? '上升' : '企稳'}的变化趋势，说明本次疗愈方向与你的状态匹配。
                </p>
              </div>
            </div>
            <div className="yyr-progress"><div style={{ width: `${Math.min(96, Math.max(8, curePct))}%` }} /></div>
            {voiceResult && (
              <div className="yyr-card yyr-voice">
                <b>你的声音，被听见了</b>
                <p>「{voiceResult}」</p>
                <small>声纹情绪判断 · 音乐场景录制</small>
              </div>
            )}
          </Sec>

          {/* ── 干预后的自我觉察 ── */}
          <Sec title="干预后的自我觉察" lead="数据之外，你的身体感受同样重要。你可以这样问自己：">
            <div className="yyr-qa">
              {qa.map((item, i) => (
                <div className="yyr-qa-item" key={i}>
                  <span className="yyr-qa-ico">?</span>
                  <div>
                    <b>{item.q}</b>
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </Sec>

          {/* ── 你的长期状态追踪 ── */}
          <Sec title="你的长期状态追踪" lead="随着使用次数增加，你的个人身心状态基线会越来越清晰">
            <div className="yyr-card">
              <TrendChart points={trend} />
            </div>
          </Sec>

          {/* ── 接下来，你可以这样做 ── */}
          <Sec title="接下来，你可以这样做">
            <div className="yyr-card yyr-plan">
              <b>1、音乐方案</b>
              <p>
                根据你的身心状态，推荐以低频舒缓、节奏稳定的音乐为主，通过旋律起伏引导呼吸与心率逐步同步。
                请使用有屿专业情绪管理音乐方案，普通音乐缺乏针对性节律设计，难以进入有效调节状态；
                不合适的音乐甚至可能强化紧张反应，建议在专业引导下聆听。
              </p>
            </div>
            <div className="yyr-card yyr-plan">
              <b>2、日常身心照护</b>
              <div className="yyr-care">
                {buffers.map((b, i) => (
                  <div className="yyr-care-item" key={b.title}>
                    <span className={`yyr-care-ico c${i % 4}`}>{b.icon}</span>
                    <div>
                      <b>{b.title}</b>
                      <p>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="yyr-card yyr-plan">
              <b>3、长期建议</b>
              <p>
                每周进行2-3次完整的音乐干预，持续4周后再生成一次完整报告。随着数据积累，有屿将为你建立个人情绪基线，让每一次疗愈都更贴合你的身心节律。
              </p>
            </div>
          </Sec>

          {/* ── 专业支持 ── */}
          <section className="yyr-support">
            <b>需要更专业的支持?</b>
            <p>
              如果你正处于痛苦、情绪崩溃或极端情绪状态中，或是长期被严重的情绪问题困扰，音乐干预之外，你可能还需要更专业、更系统的陪伴。
              我们为你提供专业数字疗愈师1对1咨询服务，由具备资质的专业人员，基于你的身心数据，给出更全面、更有针对性的数字疗愈建议。
            </p>
            <p className="yyr-support-line">你不必独自面对。需要时，我们一直在。</p>
          </section>

          {/* ── 品牌尾页 ── */}
          <footer className="yyr-foot">
            <b className="yyr-foot-brand">有屿SOULMATES</b>
            <p className="yyr-foot-slogan">心有所屿，千人千愈</p>
            <div className="yyr-foot-circles">
              <span>看见情绪</span>
              <span>理解情绪</span>
              <span>千人千愈</span>
            </div>
            <div className="yyr-disclaimer">
              <b>免责说明</b>
              <p>本报告中的所有数据和分析均基于本次检测的即时结果，仅供自我觉察与健康管理参考。</p>
              <p>不构成医疗诊断、治疗效果承诺或医学建议。</p>
              <p>情绪状态受多种因素影响，具有自然波动性。</p>
              <p>如有持续的情绪困扰，请咨询专业的情绪健康服务机构。</p>
            </div>
            <div className="yyr-div" aria-hidden><i /><span /><i /></div>
            <small>信赖度 {fmt(metrics?.confidence)}% · 心搏 {metrics?.beats ?? 0} 次 · 音符 {noteCount} 枚</small>
          </footer>
        </div>
      </div>
      <div className="report-float">
        <button className="ghost-btn" id="btn-again" onClick={() => window.location.reload()}>再体验一次</button>
        <button className="ghost-btn main" id="btn-save" disabled={saving} onClick={() => void handleSave()}>
          {saving ? '正在生成…' : saved ? '已保存到本地 ✓' : saveError ? '保存失败 · 重试' : '保存报告'}
        </button>
      </div>
    </section>
  )
}
