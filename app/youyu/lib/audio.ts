/**
 * WebAudio 引擎：交互音效 + 生成式疗愈音乐 + 自然声景
 * 由原单页 HTML 中的 AudioEngine IIFE 移植，改为模块级单例。
 */
import { ELEM_SCALE } from './data'
import type { ElemKey } from './types'

type AnyAudioNode = AudioScheduledSourceNode | AudioNode

let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function env(gainNode: GainNode, t: number, a: number, d: number, peak: number) {
  const g = gainNode.gain
  g.setValueAtTime(0.0001, t)
  g.exponentialRampToValueAtTime(peak, t + a)
  g.exponentialRampToValueAtTime(0.0001, t + a + d)
}

/** 短促上滑音（交互反馈） */
function blip(freq = 620, dur = 0.18, type: OscillatorType = 'sine') {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(freq * 1.6, c.currentTime + dur)
  env(g, c.currentTime, 0.02, dur, 0.16)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur + 0.1)
}

/** 双音铃（连接成功 / 穿越） */
function chime(base = 880) {
  blip(base, 0.3, 'sine')
  setTimeout(() => blip(base * 1.5, 0.4, 'sine'), 90)
}

/* —— 生成式疗愈音乐 —— */
let playing = false
let nodes: AnyAudioNode[] = []
let pluckTimer: ReturnType<typeof setTimeout> | null = null

function stop() {
  playing = false
  if (pluckTimer) {
    clearTimeout(pluckTimer)
    pluckTimer = null
  }
  nodes.forEach((n) => {
    try {
      const src = n as AudioScheduledSourceNode
      if (src.stop) src.stop()
      else n.disconnect()
    } catch {
      /* noop */
    }
  })
  nodes = []
}

function start(elemKey: ElemKey = 'water') {
  const c = ac()
  playing = true
  const master = c.createGain()
  master.gain.value = 0.0001
  master.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 3)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1400
  const delay = c.createDelay(1.2)
  delay.delayTime.value = 0.55
  const fb = c.createGain()
  fb.gain.value = 0.42
  const wet = c.createGain()
  wet.gain.value = 0.35
  delay.connect(fb).connect(delay)
  delay.connect(wet).connect(master)
  lp.connect(master)
  master.connect(c.destination)
  nodes.push(master, lp, delay, fb, wet)

  const scale = ELEM_SCALE[elemKey] || ELEM_SCALE.water
  const root = 220
  const noteHz = (i: number, oct = 0) =>
    root * Math.pow(2, (scale[((i % scale.length) + scale.length) % scale.length] + 12 * oct) / 12)

  ;[noteHz(0, 0), noteHz(2, 0), noteHz(0, 1)].forEach((f) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f
    o.detune.value = (Math.random() - 0.5) * 8
    g.gain.value = 0.05
    const lfo = c.createOscillator()
    const lg = c.createGain()
    lfo.frequency.value = 0.07 + Math.random() * 0.06
    lg.gain.value = 0.03
    lfo.connect(lg).connect(g.gain)
    o.connect(g).connect(lp)
    o.start()
    lfo.start()
    nodes.push(o, lfo)
  })

  let idx = Math.floor(Math.random() * 5)
  const pluck = () => {
    if (!playing) return
    idx += Math.random() < 0.5 ? 1 : -1
    const f = noteHz(idx, Math.random() < 0.3 ? 1 : 0)
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f
    env(g, c.currentTime, 0.01, 1.8, 0.16)
    o.connect(g)
    g.connect(lp)
    g.connect(delay)
    o.start()
    o.stop(c.currentTime + 2.2)
    pluckTimer = setTimeout(pluck, 500 + Math.random() * 1400)
  }
  pluck()

  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.3
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const nlp = c.createBiquadFilter()
  nlp.type = 'lowpass'
  nlp.frequency.value = 420
  const ng = c.createGain()
  ng.gain.value = 0.05
  const lfo2 = c.createOscillator()
  const lg2 = c.createGain()
  lfo2.frequency.value = 0.1
  lg2.gain.value = 0.03
  lfo2.connect(lg2).connect(ng.gain)
  src.connect(nlp).connect(ng).connect(master)
  src.start()
  lfo2.start()
  nodes.push(src, lfo2)
}

/* —— 自然声景：park=鸟鸣微风 / museum=殿堂低吟 —— */
let ambNodes: AnyAudioNode[] = []
let ambTimer: ReturnType<typeof setTimeout> | null = null
let ambOn = false

function stopAmbient() {
  ambOn = false
  if (ambTimer) {
    clearTimeout(ambTimer)
    ambTimer = null
  }
  ambNodes.forEach((n) => {
    try {
      const src = n as AudioScheduledSourceNode
      if (src.stop) src.stop()
      else n.disconnect()
    } catch {
      /* noop */
    }
  })
  ambNodes = []
}

function ambient(type: 'park' | 'museum') {
  stopAmbient()
  ambOn = true
  const c = ac()
  const master = c.createGain()
  master.gain.value = 0.0001
  master.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 2)
  master.connect(c.destination)
  ambNodes.push(master)

  if (type === 'museum') {
    // 低频圣咏感 pad
    ;[110, 164.8, 220].forEach((f, i) => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.value = f
      o.detune.value = i * 4
      g.gain.value = 0.045
      const lfo = c.createOscillator()
      const lg = c.createGain()
      lfo.frequency.value = 0.05 + i * 0.03
      lg.gain.value = 0.025
      lfo.connect(lg).connect(g.gain)
      o.connect(g).connect(master)
      o.start()
      lfo.start()
      ambNodes.push(o, lfo)
    })
  } else {
    /* —— 公园：轻柔流水 + 清脆鸟鸣 —— */
    const len = c.sampleRate * 4
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1100
    bp.Q.value = 0.8
    const lp2 = c.createBiquadFilter()
    lp2.type = 'lowpass'
    lp2.frequency.value = 4200
    const water = c.createGain()
    water.gain.value = 0.085
    const wLfo = c.createOscillator()
    const wLfoG = c.createGain()
    wLfo.frequency.value = 0.13
    wLfoG.gain.value = 420
    wLfo.connect(wLfoG).connect(bp.frequency)
    const wLfo2 = c.createOscillator()
    const wLfo2G = c.createGain()
    wLfo2.frequency.value = 0.07
    wLfo2G.gain.value = 0.03
    wLfo2.connect(wLfo2G).connect(water.gain)
    src.connect(bp).connect(lp2).connect(water).connect(master)
    src.start()
    wLfo.start()
    wLfo2.start()
    ambNodes.push(src, wLfo, wLfo2)

    // 鸟鸣：成串短促高频啾声，带颤音，随机间隔
    const birdNote = (f0: number, t0: number, dur: number, peak: number) => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(f0, t0)
      o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t0 + dur * 0.35)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.82, t0 + dur)
      const vib = c.createOscillator()
      const vibG = c.createGain()
      vib.frequency.value = 42
      vibG.gain.value = f0 * 0.06
      vib.connect(vibG).connect(o.frequency)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(peak, t0 + dur * 0.18)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      o.connect(g).connect(master)
      o.start(t0)
      o.stop(t0 + dur + 0.05)
      vib.start(t0)
      vib.stop(t0 + dur + 0.05)
    }
    const birdsong = () => {
      if (!ambOn) return
      const t0 = c.currentTime + 0.05
      const base = 2400 + Math.random() * 2200
      const notesCount = 2 + Math.floor(Math.random() * 3)
      let t = t0
      for (let i = 0; i < notesCount; i++) {
        const dur = 0.07 + Math.random() * 0.07
        birdNote(base * (1 + (Math.random() - 0.5) * 0.12), t, dur, 0.035 + Math.random() * 0.02)
        t += dur + 0.04 + Math.random() * 0.06
      }
      ambTimer = setTimeout(birdsong, 1400 + Math.random() * 4200)
    }
    ambTimer = setTimeout(birdsong, 600)
  }
}

export const AudioEngine = {
  ac,
  blip,
  chime,
  start,
  stop,
  ambient,
  stopAmbient,
  get playing() {
    return playing
  },
}
