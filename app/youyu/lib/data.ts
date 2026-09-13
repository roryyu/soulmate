/**
 * 有屿 SOULMATES · 静态数据
 * 精灵 / 五行音阶 / 音符题库 / 魔镜问答 / 有屿世界（公园 · 博物馆）
 */
import type {
  ElemKey,
  MirrorQA,
  PlaceDef,
  PlaceKey,
  Question,
  SpriteDef,
  SpriteKey,
} from './types'

/**
 * 情绪精灵（主视觉：五精灵群像图）
 * img=独立立绘（气泡头像用），gpos=群像图上的点击热区(%)，resp=选中后的积极回应
 */
export const SPRITES: Record<SpriteKey, SpriteDef> = {
  happy: {
    name: '暖暖', emo: '快乐', img: '/youyu/sprite-happy.png',
    audio: '/youyu/tts-output/happy.mp3',
    color: '#ffd98a', c1: '#ffe08a', c2: '#f0a63c',
    gpos: { x: 50, y: 66 },
    resp: '嘿嘿，被我等到啦！把这份明亮揣好，我们一起去有屿给它配上最好听的旋律吧！',
  },
  sad: {
    name: '蓝蓝', emo: '悲伤', img: '/youyu/sprite-sad.png',
    audio: '/youyu/tts-output/sad.mp3',
    color: '#9fc4ff', c1: '#9fc4ff', c2: '#3a5fd9',
    gpos: { x: 18, y: 42 },
    resp: '谢谢你愿意告诉我。眼泪是心在下雨，我会陪你把雨声谱成温柔的摇篮曲。',
  },
  angry: {
    name: '焰焰', emo: '愤怒', img: '/youyu/sprite-angry.png',
    audio: '/youyu/tts-output/angry.mp3',
    color: '#ff9d8a', c1: '#ff9d8a', c2: '#d63c2e',
    gpos: { x: 12, y: 71 },
    resp: '呼——有火气很正常，说明你在乎。跟我深呼吸，我们把火变成温暖的光。',
  },
  anxious: {
    name: '芽芽', emo: '焦虑', img: '/youyu/sprite-anxious.png',
    audio: '/youyu/tts-output/anxious.mp3',
    color: '#b7e6c4', c1: '#d5f5de', c2: '#7ac99a',
    gpos: { x: 85, y: 71 },
    resp: '没关系，那些‘万一’先放在我这里保管。现在只需要跟着我的声音，慢慢来。',
  },
  numb: {
    name: '雾雾', emo: '麻木', img: '/youyu/sprite-numb.png',
    audio: '/youyu/tts-output/numb.mp3',
    color: '#cfc4e8', c1: '#e3dcf5', c2: '#9c8fc4',
    gpos: { x: 82, y: 41 },
    resp: '感觉不到，也是一种感觉。我会用声音轻轻敲敲门，把你的感知一点点接回家。',
  },
}

/** 精灵键的固定顺序（渲染热区用） */
export const SPRITE_KEYS: SpriteKey[] = ['happy', 'sad', 'angry', 'anxious', 'numb']

/** 五声音阶（生成式疗愈音乐按主导五行选音阶） */
export const ELEM_SCALE: Record<ElemKey, number[]> = {
  wood: [0, 3, 5, 7, 10],
  fire: [0, 4, 7, 9],
  earth: [0, 2, 5, 7, 9],
  metal: [0, 2, 3, 7, 8],
  water: [0, 3, 5, 8, 10],
}

/** 音符身心题库（选择题，答案判定木火土金水） */
export const QUESTIONS: Question[] = [
  {
    t: '我常常思绪纷乱、心里压抑，肩颈容易紧绷，很难静下心', emo: 1, opts: [
      { l: '完全不符合', w: { wood: 0 } }, 
      { l: '很少出现', w: { wood: 2.5 } },
      { l: '一半一半', w: { wood: 5 } }, 
      { l: '经常出现', w: { wood: 7.5 } },
      { l: '几乎每天都这样', w: { wood: 10 } }]
  },
  {
    t: '我偶尔会提不起劲儿，浑身慵懒乏力，做什么都淡淡的没兴趣', emo: 1, opts: [
      { l: '完全不符合', w: { water: 0 } }, 
      { l: '很少出现', w: { water: 2.5 } },
      { l: '一半一半', w: { water: 5 } }, 
      { l: '经常出现', w: { water: 7.5 } },
      { l: '几乎每天都这样', w: { water: 10 } }]
  },
  {
    t: '我遇上烦心事总习惯憋在心里，胸口闷闷的，不愿意和别人多说', emo: 1, opts: [
      { l: '完全不符合', w: { wood: 0 } }, 
      { l: '很少出现', w: { wood: 2.5 } },
      { l: '一半一半', w: { wood: 5 } }, 
      { l: '经常出现', w: { wood: 7.5 } },
      { l: '几乎每天都这样', w: { wood: 10 } }]
  },
  {
    t: '心里委屈时会独自压抑，胸口发堵，不好意思主动表达感受', emo: 1, opts: [
      { l: '完全不符合', w: { wood: 0 } }, 
      { l: '很少出现', w: { wood: 2.5 } },
      { l: '一半一半', w: { wood: 5 } }, 
      { l: '经常出现', w: { wood: 7.5 } },
      { l: '几乎每天都这样', w: { wood: 10 } }]
  },
  {
    t: '碰到重要事情容易反复思虑，胸口发闷、心跳变快，心神安定不下来', emo: 1, opts: [
      { l: '完全不符合', w: { fire: 0 } }, 
      { l: '很少出现', w: { fire: 2.5 } },
      { l: '一半一半', w: { fire: 5 } }, 
      { l: '经常出现', w: { fire: 7.5 } },
      { l: '几乎每天都这样', w: { fire: 10 } }]
  },
  {
    t: '面对事情容易自我否定，心慌气短，总觉得自己做得不够好', emo: 1, opts: [
      { l: '完全不符合', w: { fire: 0 } }, 
      { l: '很少出现', w: { fire: 2.5 } },
      { l: '一半一半', w: { fire: 5 } }, 
      { l: '经常出现', w: { fire: 7.5 } },
      { l: '几乎每天都这样', w: { fire: 10 } }]
  },
  {
    t: '一点小事会在脑子里反复琢磨，心神放不下，脑袋昏沉紧绷', emo: 1, opts: [
      { l: '完全不符合', w: { earth: 0 } }, 
      { l: '很少出现', w: { earth: 2.5 } },
      { l: '一半一半', w: { earth: 5 } }, 
      { l: '经常出现', w: { earth: 7.5 } },
      { l: '几乎每天都这样', w: { earth: 10 } }]
  },
  {
    t: '日常很容易走神，精神涣散，浑身懒懒没有力气', emo: 1, opts: [
      { l: '完全不符合', w: { earth: 0 } }, 
      { l: '很少出现', w: { earth: 2.5 } },
      { l: '一半一半', w: { earth: 5 } }, 
      { l: '经常出现', w: { earth: 7.5 } },
      { l: '几乎每天都这样', w: { earth: 10 } }]
  },
  {
    t: '小事容易憋在心底，胸口压抑发闷，凡事总往消极方向多想', emo: 1, opts: [
      { l: '完全不符合', w: { metal: 0 } }, 
      { l: '很少出现', w: { metal: 2.5 } },
      { l: '一半一半', w: { metal: 5 } }, 
      { l: '经常出现', w: { metal: 7.5 } },
      { l: '几乎每天都这样', w: { metal: 10 } }]
  },
  {
    t: '人多场合会紧张拘谨，胸口发闷，不敢主动说出内心想法', emo: 1, opts: [
      { l: '完全不符合', w: { metal: 0 } }, 
      { l: '很少出现', w: { metal: 2.5 } },
      { l: '一半一半', w: { metal: 5 } }, 
      { l: '经常出现', w: { metal: 7.5 } },
      { l: '几乎每天都这样', w: { metal: 10 } }]
  },
  {
    t: '上台、考试前心跳加速，心神紧绷，夜里容易胡思乱想睡不踏实', emo: 1, opts: [
      { l: '完全不符合', w: { water: 0 } }, 
      { l: '很少出现', w: { water: 2.5 } },
      { l: '一半一半', w: { water: 5 } }, 
      { l: '经常出现', w: { water: 7.5 } },
      { l: '几乎每天都这样', w: { water: 10 } }]
  },
  {
    t: '压力大的时候身心疲惫，只想独自安静休息，提不起精神互动', emo: 1, opts: [
      { l: '完全不符合', w: { water: 0 } }, 
      { l: '很少出现', w: { water: 2.5 } },
      { l: '一半一半', w: { water: 5 } }, 
      { l: '经常出现', w: { water: 7.5 } },
      { l: '几乎每天都这样', w: { water: 10 } }]
  },
  {
    t: '我平时晚上睡觉总能睡得踏实安稳，你呢？', emo: 1, opts: [
      { l: '完全不符合', w: { water: 0 } }, 
      { l: '很少出现', w: { water: 2.5 } },
      { l: '一半一半', w: { water: 5 } }, 
      { l: '经常出现', w: { water: 7.5 } },
      { l: '几乎每天都这样', w: { water: 10 } }]
  },
  {
    t: '我做事很容易集中精神，你是不是也一样？', emo: 1, opts: [
      { l: '完全不符合', w: { earth: 0 } }, 
      { l: '很少出现', w: { earth: 2.5 } },
      { l: '一半一半', w: { earth: 5 } }, 
      { l: '经常出现', w: { earth: 7.5 } },
      { l: '几乎每天都这样', w: { earth: 10 } }]
  },
  {
    t: '我和家人、小伙伴相处都很轻松开心，你呢？', emo: 1, opts: [
      { l: '完全不符合', w: { wood: 0 } }, 
      { l: '很少出现', w: { wood: 2.5 } },
      { l: '一半一半', w: { wood: 5 } }, 
      { l: '经常出现', w: { wood: 7.5 } },
      { l: '几乎每天都这样', w: { wood: 10 } }]
  },
  {
    t: '我日常很容易心神慌乱、思虑过多吗？', emo: 1, opts: [
      { l: '完全不符合', w: { fire: 0 } }, 
      { l: '很少出现', w: { fire: 2.5 } },
      { l: '一半一半', w: { fire: 5 } }, 
      { l: '经常出现', w: { fire: 7.5 } },
      { l: '几乎每天都这样', w: { fire: 10 } }]
  },
]

/** 魔镜秘境：语音问答脚本（60 秒，约 5 轮） */
export const MIRROR_QA: MirrorQA[] = [
  {
    q: '接下来，我们要去一个美好的地方。请拿起手机，把脸对准镜子，和我一起开启秘境吧。先告诉我——今天，你过得怎么样？',
    chips: ['还不错', '一般般', '有点难']
  },
  {
    q: '嗯，我听到了。最近让你消耗最多能量的事情是什么呢？',
    chips: ['工作学习', '人际关系', '说不清']
  },
  {
    q: '辛苦啦。那最近有没有一件小事，让你心里亮了一下？',
    chips: ['有，比如美食', '和朋友聊天', '好像没有']
  },
  {
    q: '真好，把它记住。现在轻轻动一下肩膀，放松——你的身体此刻感觉如何？',
    chips: ['挺放松', '有点紧绷', '很疲惫']
  },
  {
    q: '收到。最后一个悄悄的问题：你希望这段疗愈音乐，把你带去哪里？',
    chips: ['安静的海边', '温暖的森林', '星空之下']
  },
]

export const MIRROR_WARNS = [
  '光线有点暗，往窗户那边转一点 ☀',
  '脸再靠近镜子一点点，好嘞！',
  '手机举高一点点，我在找你的光 ✨',
]

export const MIRROR_ACK = [
  '嗯嗯，你的声音频率我记下了 🎵',
  '谢谢你告诉我，星光又亮了一颗 ✦',
  '我听到了，这很重要。',
]

/** 有屿世界：公园 / 博物馆 */
export const WORLD: Record<PlaceKey, PlaceDef> = {
  park: {
    name: '有屿音乐公园', desc: '自然声景 · 音符生长的地方', ambient: 'park',
    door: { x: 22, y: 74 }, bg: '/youyu/park.jpg',
    notes: [{ x: 14, y: 26 }, { x: 52, y: 20 }, { x: 80, y: 28 }, { x: 26, y: 38 }, { x: 68, y: 41 }, { x: 44, y: 49 },
    { x: 12, y: 55 }, { x: 84, y: 57 }, { x: 32, y: 65 }, { x: 62, y: 69 }, { x: 20, y: 77 }, { x: 76, y: 82 }],
  },
  museum: {
    name: '有屿音乐博物馆', desc: '百年乐章 · 在这里被唤醒', ambient: 'museum',
    door: { x: 68, y: 56 }, bg: '/youyu/museum.jpg',
    notes: [{ x: 18, y: 22 }, { x: 56, y: 18 }, { x: 84, y: 27 }, { x: 30, y: 35 }, { x: 72, y: 37 }, { x: 46, y: 47 },
    { x: 14, y: 53 }, { x: 86, y: 57 }, { x: 36, y: 63 }, { x: 66, y: 67 }, { x: 24, y: 75 }, { x: 58, y: 81 }],
  },
}

/** 场景背景图（供各 scene 组件引用） */
export const IMAGES = {
  cosmos: '/youyu/cosmos.jpg',
  spriteGroup: '/youyu/sprites-group.jpg',
  gate: '/youyu/gate.jpg',
  gateTransparent: '/youyu/gate_transparent.png',
  world: '/youyu/world.jpg',
  park: '/youyu/park.jpg',
  museum: '/youyu/museum.jpg',
  report: '/youyu/report.jpg',
} as const

/** 需要收集齐的音符总数 */
export const NOTE_GOAL = 12

/** 音符字形循环 */
export const NOTE_GLYPHS = ['♪', '♫', '♩', '♬']
