/**
 * 林间音乐会 - 数据、评分与本地存储逻辑
 * 由原 Vite 构建产物 index-D-YXTryu.js 反编译改写为 TypeScript
 */

/** 静态资源根路径（图片/视频均放在 public/linjian 下） */
export const ASSET_BASE = '/linjian'

// ========== 类型定义 ==========

/** 五位森林伙伴的键名 */
export type AnimalKey = 'deer' | 'bird' | 'bear' | 'dove' | 'fish'

/** 森林伙伴信息 */
export interface Animal {
  name: string
  avatar: string
  scene: string
  color: string
  className: string
}

/** 题目定义（track 用于展示"舒缓轨道 N 维度作答中"） */
export interface Question {
  id: string
  animal: AnimalKey
  track: number | string
  text: string
}

/** 评分选项 */
export interface RatingOption {
  label: string
  score: number
  hint: string
}

/** 应用流程阶段 */
export type Phase =
  | 'intro'
  | 'guide'
  | 'quiz'
  | 'branch-choice'
  | 'branch'
  | 'transition'
  | 'collect'
  | 'player'

/** 支线选择：直接开启乐曲 / 继续共鸣收集 */
export type Branch = 'direct' | 'calibration'

/** 本地进度存档结构 */
export interface Progress {
  version: number
  sessionId: string
  createdAt: string
  phase: Phase
  mainIndex: number
  branchIndex: number
  qScores: number[]
  tScores: number[]
  answerTimes: number[]
  branch: Branch
}

/** 问卷评分结果数据包（五轨音量配方） */
export interface ResultPacket {
  vol1: number
  vol2: number
  vol3: number
  vol4: number
  vol5: number
  base_tone: string
  offset_arr: number[]
  level_arr: string[]
  global_offset: number
  q_score: number[]
  t_score: number[]
  total_time: number
  is_balance: boolean
  has_conflict: boolean
  alpha: number
  beta: number
  brain_correct: number[]
  fusion_tag: string
}

/** 保存状态 */
export type SaveStatus = 'saving' | 'saved' | 'error'

// ========== 评分算法 ==========

const VOLUME_MIN = 0.05
const VOLUME_MAX = 0.95

/** 将音量限制在 [0.05, 0.95] 区间 */
function clampVolume(value: number, min = VOLUME_MIN, max = VOLUME_MAX): number {
  return Math.min(max, Math.max(min, value))
}

/** 保留 3 位小数 */
function round3(value: number): number {
  return Number(value.toFixed(3))
}

/** 根据偏移量绝对值判定失衡等级 */
function offsetLevel(offset: number): string {
  const abs = Math.abs(offset)
  return abs >= 11 ? '重度失衡' : abs >= 6 ? '中度失衡' : '轻微失衡'
}

/** 校验答案数组：长度与合法分值（0/2.5/5/7.5/10） */
function validateScores(scores: number[], count: number, label: string): void {
  if (!Array.isArray(scores) || scores.length !== count)
    throw new Error(`${label}必须包含${count}个分值`)
  const valid = new Set([0, 2.5, 5, 7.5, 10])
  if (scores.some((s) => !valid.has(s))) throw new Error(`${label}包含无效分值`)
}

/**
 * 核心评分算法：由 12 题主线答案（+可选 4 题支线答案）生成五轨配方数据包
 * @param qScores 主线 12 题分值
 * @param tScores 支线 4 题分值（可为空数组）
 * @param totalTime 主线作答总时长（秒），用于"随意作答"检测
 */
export function buildPacket(
  qScores: number[],
  tScores: number[] = [],
  totalTime = 0
): ResultPacket {
  validateScores(qScores, 12, '主线答案')
  if (tScores.length > 0) validateScores(tScores, 4, '支线答案')

  // 五轨原始分：轨1 由前 4 题构成，轨 2-5 各由 2 题构成
  const trackSums = [
    qScores.slice(0, 4).reduce((sum, s) => sum + s, 0),
    qScores[4] + qScores[5],
    qScores[6] + qScores[7],
    qScores[8] + qScores[9],
    qScores[10] + qScores[11],
  ]
  let volumes = [
    trackSums[0] / 40,
    (trackSums[1] / 20) * 2,
    (trackSums[2] / 20) * 2,
    (trackSums[3] / 20) * 2,
    (trackSums[4] / 20) * 2,
  ]

  // 每轨偏移量：正向题分值 - 负向题分值
  const offsets = [
    qScores[0] + qScores[2] - qScores[1] - qScores[3],
    qScores[4] - qScores[5],
    qScores[6] - qScores[7],
    qScores[8] - qScores[9],
    qScores[10] - qScores[11],
  ]

  // 冲突检测：同一轨的正向题与负向题同时出现高分（>=7.5）
  const positiveIdx = [[0, 2], [4], [6], [8], [10]]
  const negativeIdx = [[1, 3], [5], [7], [9], [11]]
  const conflicts = positiveIdx.map((idxList, track) => {
    const hasPositiveHigh = idxList.some((i) => qScores[i] >= 7.5)
    const hasNegativeHigh = negativeIdx[track].some((i) => qScores[i] >= 7.5)
    return hasPositiveHigh && hasNegativeHigh
  })

  // 冲突轨按偏移方向微调音量（±0.08）
  volumes = volumes.map((vol, track) =>
    conflicts[track] ? vol + (offsets[track] < 0 ? 0.08 : -0.08) : vol
  )

  // 支线校准：答案 >=5 减 0.05，<=2 加 0.05，作用到对应轨道
  if (tScores.length === 4) {
    const calibrations = [
      { answer: tScores[0], tracks: [4] },
      { answer: tScores[1], tracks: [2] },
      { answer: tScores[2], tracks: [0, 3] },
      { answer: tScores[3], tracks: [1] },
    ]
    calibrations.forEach(({ answer, tracks }) => {
      const delta = answer >= 5 ? -0.05 : answer <= 2 ? 0.05 : 0
      tracks.forEach((track) => {
        volumes[track] += delta
      })
    })
  }

  // 随意作答检测：总时长 <40 秒且极端分值（0 或 10）>=6 个，判定为均衡状态
  const extremeCount = qScores.filter((s) => s === 0 || s === 10).length
  const isBalance = totalTime < 40 && extremeCount >= 6

  // 全局偏移：正向题总分 - 负向题总分
  const positiveSum = [0, 2, 4, 6, 8, 10].reduce((sum, i) => sum + qScores[i], 0)
  const negativeSum = [1, 3, 5, 7, 9, 11].reduce((sum, i) => sum + qScores[i], 0)
  const globalOffset = isBalance ? 0 : positiveSum - negativeSum
  if (isBalance) volumes = [0.5, 0.5, 0.5, 0.5, 0.5]

  // 基调配方由绝对偏移最大的轨道方向决定
  const dominantTrack = offsets.reduce(
    (maxIdx, offset, idx, arr) => (Math.abs(offset) > Math.abs(arr[maxIdx]) ? idx : maxIdx),
    0
  )
  const baseTone = offsets[dominantTrack] < 0 ? '舒展滋养配方' : '收敛舒缓配方'
  const finalVolumes = volumes.map((vol) => round3(clampVolume(vol)))

  return {
    vol1: finalVolumes[0],
    vol2: finalVolumes[1],
    vol3: finalVolumes[2],
    vol4: finalVolumes[3],
    vol5: finalVolumes[4],
    base_tone: baseTone,
    offset_arr: offsets,
    level_arr: offsets.map(offsetLevel),
    global_offset: globalOffset,
    q_score: qScores,
    t_score: tScores,
    total_time: round3(totalTime),
    is_balance: isBalance,
    has_conflict: conflicts.some(Boolean),
    alpha: 0,
    beta: 0,
    brain_correct: [0, 0, 0, 0, 0],
    fusion_tag: '纯问卷',
  }
}

// ========== 静态数据 ==========

/** 五档评分选项 */
export const RATING_OPTIONS: RatingOption[] = [
  { label: '完全不符合', score: 0, hint: '几乎没有' },
  { label: '很少出现', score: 2.5, hint: '偶尔如此' },
  { label: '一半一半', score: 5, hint: '有时会有' },
  { label: '经常出现', score: 7.5, hint: '多数时候' },
  { label: '几乎每天都这样', score: 10, hint: '非常贴近' },
]

/** 五位森林伙伴 */
export const ANIMALS: Record<AnimalKey, Animal> = {
  deer: {
    name: '小鹿',
    avatar: `${ASSET_BASE}/木鹿头像.jpg`,
    scene: `${ASSET_BASE}/木鹿.jpg`,
    color: '#82cdb8',
    className: 'mint',
  },
  bird: {
    name: '小鸟',
    avatar: `${ASSET_BASE}/火鸟头像.jpg`,
    scene: `${ASSET_BASE}/火鸟.jpg`,
    color: '#efa777',
    className: 'orange',
  },
  bear: {
    name: '小熊',
    avatar: `${ASSET_BASE}/土熊头像.jpg`,
    scene: `${ASSET_BASE}/土熊.jpg`,
    color: '#e4bf61',
    className: 'gold',
  },
  dove: {
    name: '白鸽',
    avatar: `${ASSET_BASE}/金白鸽头像.jpg`,
    scene: `${ASSET_BASE}/金白鸽.jpg`,
    color: '#e8ddbd',
    className: 'ivory',
  },
  fish: {
    name: '小鱼',
    avatar: `${ASSET_BASE}/水小鱼头像.jpg`,
    scene: `${ASSET_BASE}/水小鱼.jpg`,
    color: '#77c6dc',
    className: 'blue',
  },
}

/** 主线 12 题 */
export const MAIN_QUESTIONS: Question[] = [
  { id: 'Q1', animal: 'deer', track: 1, text: '心里容易闷堵，遇事爱叹气，小事也容易心里不痛快' },
  { id: 'Q2', animal: 'fish', track: 1, text: '手脚常年偏凉，怕冷，喜欢暖和、晒太阳，不耐冷风' },
  { id: 'Q3', animal: 'deer', track: 1, text: '脖颈、肩膀经常僵硬发紧，活动舒展之后才舒服' },
  { id: 'Q4', animal: 'deer', track: 1, text: '习惯把心事闷在心里，有委屈不爱对外人讲' },
  { id: 'Q5', animal: 'bird', track: 2, text: '容易心慌烦躁，夜里多梦，醒后很难再睡着' },
  { id: 'Q6', animal: 'bird', track: 2, text: '总觉得身上燥热，手心发热，平时更想喝凉水' },
  { id: 'Q7', animal: 'bear', track: 3, text: '饭后容易肚子胀、犯困，胃口时好时坏，消化不如从前' },
  { id: 'Q8', animal: 'bear', track: 3, text: '平时四肢沉重、浑身没劲，不太愿意出门走动做家务' },
  { id: 'Q9', animal: 'dove', track: 4, text: '容易莫名伤感怀旧，想起往事心里难受、情绪低落' },
  { id: 'Q10', animal: 'dove', track: 4, text: '吹风、换季容易嗓子干痒、咳嗽，鼻腔经常干燥' },
  { id: 'Q11', animal: 'fish', track: 5, text: '腰和膝盖经常酸软无力，走路久了腿脚发酸发沉' },
  { id: 'Q12', animal: 'fish', track: 5, text: '皮肤容易发干发痒，换季干燥不适感更明显' },
]

/** 支线校准 4 题 */
export const BRANCH_QUESTIONS: Question[] = [
  { id: 'T1', animal: 'fish', track: 5, text: '天气一变冷，身体各种不舒服会明显加重' },
  { id: 'T2', animal: 'bear', track: 3, text: '操心思虑太多，就胃口变差、浑身疲惫不想动' },
  { id: 'T3', animal: 'deer', track: '1 · 4', text: '遇到烦心事容易憋在心里，肩颈时常僵硬酸痛' },
  { id: 'T4', animal: 'bird', track: 2, text: '遇事容易急躁上火，一点不顺心就心里燥热难受' },
]

export const AUDIO_FILES=[
  {id: 'Q1', src: `${ASSET_BASE}/audio/1.mp3`},
  {id: 'Q2', src: `${ASSET_BASE}/audio/2.mp3`},
  {id: 'Q3', src: `${ASSET_BASE}/audio/3.mp3`},
  {id: 'Q4', src: `${ASSET_BASE}/audio/4.mp3`},
  {id: 'Q5', src: `${ASSET_BASE}/audio/5.mp3`},
  {id: 'Q6', src: `${ASSET_BASE}/audio/6.mp3`},
  {id: 'Q7', src: `${ASSET_BASE}/audio/7.mp3`},
  {id: 'Q8', src: `${ASSET_BASE}/audio/8.mp3`},
  {id: 'Q9', src: `${ASSET_BASE}/audio/9.mp3`},
  {id: 'Q10', src: `${ASSET_BASE}/audio/10.mp3`},
  {id: 'Q11', src: `${ASSET_BASE}/audio/11.mp3`},
  {id: 'Q12', src: `${ASSET_BASE}/audio/12.mp3`},
  {id: 'T1', src: `${ASSET_BASE}/audio/13.mp3`},
  {id: 'T2', src: `${ASSET_BASE}/audio/14.mp3`},
  {id: 'T3', src: `${ASSET_BASE}/audio/15.mp3`},
  {id: 'T4', src: `${ASSET_BASE}/audio/16.mp3`},

]
/** 每答完 3 题的奖励过场视频（对应第 1/2/3 组） */
export const REWARD_VIDEOS = [
  `${ASSET_BASE}/奖励画面1只需要截取2-3秒音效3个奖励画面统一.mp4`,
  `${ASSET_BASE}/奖励画面2只需要截取2-3秒音效3个奖励画面统一.mp4`,
  `${ASSET_BASE}/奖励画面3只需要截取2-3秒音效3个奖励画面统一.mp4`,
]

/** 其它流程视频 */
export const VIDEOS = {
  intro: `${ASSET_BASE}/1开头画面.mp4`,
  branchChoice: `${ASSET_BASE}/集齐音符画面.mp4`,
  transition: `${ASSET_BASE}/切换动画.mp4`,
  player: `${ASSET_BASE}/治愈森林音乐会视频生成.mp4`,
} as const
export const MUSICS={
  '1': `oss://soulmate-music/toc-data/1.wav`,
  '2': `oss://soulmate-music/toc-data/2.wav`,
  '3': `oss://soulmate-music/toc-data/3.wav`,
  '4': `oss://soulmate-music/toc-data/4.wav`,
  '5': `oss://soulmate-music/toc-data/5.wav`,
}
// ========== 本地进度存储 ==========

/** localStorage 存档键 */
export const STORAGE_KEY = 'forest-concert-progress-v1'

/** 空白存档 */
export const EMPTY_PROGRESS: Progress = {
  version: 1,
  sessionId: '',
  createdAt: '',
  phase: 'intro',
  mainIndex: 0,
  branchIndex: 0,
  qScores: [],
  tScores: [],
  answerTimes: [],
  branch: 'direct',
}

/** 生成会话 ID（优先使用 crypto.randomUUID） */
export function createSessionId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `forest-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}

/** 创建全新存档 */
export function createProgress(): Progress {
  return { ...EMPTY_PROGRESS, sessionId: createSessionId(), createdAt: new Date().toISOString() }
}

/**
 * 加载本地进度存档；URL 携带 ?restart 时清空存档并重置地址栏
 */
export function loadProgress(): Progress {
  if (new URLSearchParams(window.location.search).has('restart')) {
    localStorage.removeItem(STORAGE_KEY)
    window.history.replaceState({}, '', window.location.pathname)
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Progress | null
    if (saved?.version === 1 && saved?.sessionId) return { ...EMPTY_PROGRESS, ...saved }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return createProgress()
}
