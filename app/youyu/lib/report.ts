/**
 * 有屿 SOULMATES · 身心觉察报告 —— 数据换算工具
 * 把 YouyuApp 全局 state（魔镜指标 / 五行能量 / 情绪精灵 / 声纹文本）
 * 换算成报告长页所需的展示结构；0-100 维度均为启发式换算，仅用于可视化。
 */
import type { AbilityItem, Metrics, MoodBarItem, QaItem, BufferItem } from '@/lib/types'
import type { ElemKey } from './types'

/** 数值格式化：空值 / NaN 统一显示 '--' */
export const fmt = (v: number | null | undefined, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d)

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))

/** 指标值按 [lo, hi] 线性映射到 0-100；缺测时给中性值 50 */
const norm = (v: number | null, lo: number, hi: number): number =>
  v == null || Number.isNaN(v) ? 50 : clamp(Math.round(((v - lo) / (hi - lo)) * 100))

/* ---------- 六维情绪状态 ---------- */

export interface EmoDims {
  tension: number // 紧张（压力指数 SI）
  anxiety: number // 焦虑（认知负荷 MWI）
  relax: number // 放松（HRV RMSSD）
  pleasure: number // 愉悦（疲劳指数反向）
  stress: number // 压力（交感平衡比 LF/HF）
  sleep: number // 睡眠（认知负荷反向）
}

/** 魔镜实测指标 → 六维情绪状态（0-100） */
export function emoDims(m: Metrics | null): EmoDims {
  if (!m) return { tension: 52, anxiety: 48, relax: 46, pleasure: 50, stress: 45, sleep: 44 }
  return {
    tension: norm(m.si, 60, 140),
    anxiety: norm(m.mwi, 20, 80),
    relax: norm(m.rmssd, 15, 80),
    pleasure: 100 - norm(m.fi, 20, 80),
    stress: norm(m.lfhf, 0.3, 2.6),
    sleep: 100 - norm(m.mwi, 25, 85),
  }
}

/** 六维展示顺序与配色（与报告长图一致） */
export const DIM_DEFS: { key: keyof EmoDims; label: string; color: string }[] = [
  { key: 'tension', label: '紧张', color: '#f2986b' },
  { key: 'anxiety', label: '焦虑', color: '#e8a33c' },
  { key: 'relax', label: '放松', color: '#22d3ee' },
  { key: 'pleasure', label: '愉悦', color: '#5bc8f5' },
  { key: 'stress', label: '压力', color: '#e9c548' },
  { key: 'sleep', label: '睡眠', color: '#5ec26a' },
]

export type LevelTone = 'high' | 'mid' | 'low'
export interface Level { text: string; tone: LevelTone }

/** 带箭头的倾向文案（摘要页签用）：偏高 ↑ / 一般 → / 偏低 ↓ */
export const levelOf = (v: number): Level =>
  v >= 60 ? { text: '偏高 ↑', tone: 'high' } : v <= 40 ? { text: '偏低 ↓', tone: 'low' } : { text: '一般 →', tone: 'mid' }

/** 不带箭头的徽章文案（详解卡用）：偏高 / 均衡 / 偏低 */
export const badgeOf = (v: number): Level =>
  v >= 60 ? { text: '偏高', tone: 'high' } : v <= 40 ? { text: '偏低', tone: 'low' } : { text: '均衡', tone: 'mid' }

/** 按正常区间判偏离（实测指标用）：高于区间 → 偏高，低于区间 → 偏低，区间内 → 均衡；缺测给均衡 */
export const rangeBadge = (v: number | null | undefined, lo: number, hi: number): Level =>
  v == null || Number.isNaN(v)
    ? { text: '均衡', tone: 'mid' }
    : v > hi
      ? { text: '偏高', tone: 'high' }
      : v < lo
        ? { text: '偏低', tone: 'low' }
        : { text: '均衡', tone: 'mid' }

/* ---------- 五行 ---------- */

export interface ElemMeta {
  key: ElemKey
  label: string
  color: string
  /** 主导体质标题，如「升发之气旺盛」 */
  title: string
  desc: string
  keywords: string
  /** 干预方向关键词，如「疏泄」 */
  practice: string
}

export const ELEM_META: Record<ElemKey, ElemMeta> = {
  wood: {
    key: 'wood', label: '木', color: '#5cb85c', title: '升发之气旺盛',
    desc: '目标感强、行动力高，但也容易因受阻而产生郁结、烦躁。',
    keywords: '易怒、压抑、思虑多、入睡难。宜疏不宜堵。', practice: '疏泄',
  },
  fire: {
    key: 'fire', label: '火', color: '#e0785a', title: '神明之火偏旺',
    desc: '表达欲强、感染力足，但心神外浮，容易心慌气短、思虑过多。',
    keywords: '心慌、兴奋、多言、难静心。宜安神定志。', practice: '安神',
  },
  earth: {
    key: 'earth', label: '土', color: '#e2b33c', title: '运化之思偏重',
    desc: '承载力强、思虑周全，但反复琢磨易精神涣散、浑身乏力。',
    keywords: '多思、涣散、倦怠、胃口波动。宜健脾定志。', practice: '健脾定志',
  },
  metal: {
    key: 'metal', label: '金', color: '#c9b98a', title: '肃降之气偏郁',
    desc: '条理清晰、自我要求高，但情绪内收，容易胸闷压抑、多思悲观。',
    keywords: '胸闷、悲观、憋闷、易伤感。宜宣发肃降。', practice: '宣发肃降',
  },
  water: {
    key: 'water', label: '水', color: '#4fc3f7', title: '封藏之力偏耗',
    desc: '感受力深、耐力好，但精力透支后易疲惫乏力、睡眠不稳。',
    keywords: '疲惫、怕冷、入睡难、易惊醒。宜封藏固本。', practice: '封藏固本',
  },
}

export const ELEM_ORDER: ElemKey[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** 五行能量累计分 → 0-100 相对值（取最大者为 100，保底 8 避免雷达塌缩） */
export function elemValues(elem: Record<ElemKey, number>): number[] {
  const vs = ELEM_ORDER.map((k) => elem[k] || 0)
  const max = Math.max(...vs, 1)
  return vs.map((v) => Math.max(8, Math.round((v / max) * 100)))
}

/** 主导五行对应的情绪能力类型名 */
export const ELEM_ARCHETYPE: Record<ElemKey, string> = {
  wood: '生长型决策者', fire: '照耀型表达者', earth: '承载型守护者',
  metal: '沉淀型思考者', water: '流动型感受者',
}

/* ---------- 报告编号 / 日期 ---------- */

/** 报告编号：SMS-YYYYMMD-序号（哈希稳定可复现） */
export function reportNo(seed: string): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  let h = 0
  const s = seed + ymd
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return `SMS-${ymd}-${String(h).padStart(5, '0')}`
}

/** 检测日期：2026/8/16 形式 */
export function dateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

/* ---------- 大模型内容兜底 ---------- */

/** 情绪能力四维兜底（insights 未返回时按六维换算） */
export function fallbackAbility(d: EmoDims): AbilityItem[] {
  return [
    { label: '状态力', value: Math.round((d.relax + d.pleasure) / 2), hint: '精力与状态维持', color: '#5ec26a' },
    { label: '平视力', value: Math.round(100 - (d.tension + d.stress) / 2), hint: '看待事情的平稳度', color: '#22d3ee' },
    { label: '心视力', value: Math.round(100 - d.anxiety), hint: '觉察内心的清晰度', color: '#5bc8f5' },
    { label: '乐视力', value: Math.round(d.pleasure), hint: '感受愉悦的能力', color: '#e9c548' },
  ]
}

/** 当下状态倾向条兜底 */
export function fallbackMoodBars(d: EmoDims): MoodBarItem[] {
  return [
    { label: '平稳安定', value: d.relax, color: '#5ec26a' },
    { label: '紧绷焦虑', value: d.tension, color: '#e8a33c' },
    { label: '低沉疲惫', value: 100 - d.pleasure, color: '#5bc8f5' },
    { label: '愉悦开放', value: d.pleasure, color: '#e9c548' },
  ]
}

/** 干预后自我觉察问答兜底 */
export const FALLBACK_QA: QaItem[] = [
  { q: '你的呼吸是否比干预前更深、更缓慢', a: '这是副交感神经被激活的常见信号。' },
  { q: '你的眉间、肩膀、下颌是否有松动？', a: '身体放松往往先于意识觉察。' },
  { q: '你的脑海中纷繁杂乱的思绪是否开始平静？', a: '这是情绪调节发生的关键体验。' },
]

/** 日常身心照护兜底（与报告长图一致） */
export const FALLBACK_BUFFERS: BufferItem[] = [
  { icon: '🌿', title: '植物精油香薰', desc: '佛手柑、甜橙、花梨花木精油 1:1:1 香薰，疏解气机' },
  { icon: '🍵', title: '草本茶饮调节', desc: '玫瑰花茶、菊花枸杞茶，每日代茶饮' },
  { icon: '🌬️', title: '5分钟呼吸练习', desc: '腹式呼吸：吸气4秒、屏息2秒、呼气6秒' },
  { icon: '🧘', title: '10分钟冥想练习', desc: '睡前正念冥想，安静坐下、闭眼、关注呼吸' },
]

/* ---------- 长期状态追踪（localStorage 历史） ---------- */

export interface TrendPoint {
  t: number
  tension: number
  relax: number
  stress: number
  sleep: number
}

/** 趋势图四条曲线定义 */
export const TREND_SERIES: { key: keyof Omit<TrendPoint, 't'>; label: string; color: string }[] = [
  { key: 'tension', label: '紧张度', color: '#f2986b' },
  { key: 'relax', label: '放松度', color: '#22d3ee' },
  { key: 'stress', label: '压力值', color: '#e9c548' },
  { key: 'sleep', label: '睡眠质量', color: '#5ec26a' },
]

const TREND_KEY = 'youyu-report-trend'
const TREND_MAX = 5

export function loadTrend(): TrendPoint[] {
  try {
    const raw = localStorage.getItem(TREND_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.filter((p) => p && typeof p.t === 'number').slice(-TREND_MAX)
  } catch {
    return []
  }
}

/** 追加一次记录：1 分钟内的重复进入视为同一次（覆盖），最多保留 5 次 */
export function appendTrend(p: TrendPoint): TrendPoint[] {
  const list = loadTrend()
  const last = list[list.length - 1]
  const next = last && p.t - last.t < 60_000 ? [...list.slice(0, -1), p] : [...list, p]
  const capped = next.slice(-TREND_MAX)
  try {
    localStorage.setItem(TREND_KEY, JSON.stringify(capped))
  } catch {
    /* 隐私模式等场景静默降级：仅本次会话内展示 */
  }
  return capped
}
