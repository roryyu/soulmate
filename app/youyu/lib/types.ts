/** 有屿 SOULMATES · 数字疗愈体验版 —— 共享类型 */

/** 五只情绪精灵的键 */
export type SpriteKey = 'happy' | 'sad' | 'angry' | 'anxious' | 'numb'

/** 五行：木(肝·怒) 火(心·喜) 土(脾·思) 金(肺·悲) 水(肾·恐) */
export type ElemKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

/** 可进入的场所 */
export type PlaceKey = 'park' | 'museum'

/** 全部场景 id（沿用原 HTML 中的 scene-* 命名，便于复用样式） */
export type SceneId =
  | 'scene-splash'
  | 'scene-sprite'
  | 'scene-mirror'
  | 'scene-world'
  | 'scene-park'
  | 'scene-museum'
  | 'scene-music'
  | 'scene-report'

export interface SpriteDef {
  name: string
  emo: string
  img: string
  /** 预生成 TTS 音频路径 */
  audio: string
  color: string
  c1: string
  c2: string
  /** 群像图上的点击热区（百分比坐标） */
  gpos: { x: number; y: number }
  resp: string
}

export interface QuestionOption {
  l: string
  w: Partial<Record<ElemKey, number>>
}

export interface Question {
  t: string
  /** 1=情绪题，0=身体题 */
  emo: 0 | 1
  opts: QuestionOption[]
}

export interface MirrorQA {
  q: string
  chips: string[]
}

export interface PlaceDef {
  name: string
  desc: string
  ambient: 'park' | 'museum'
  door: { x: number; y: number }
  bg: string
  notes: { x: number; y: number }[]
}
