'use client'

/**
 * 场景 2：情绪精灵星域
 * 群像主视觉上叠加 5 个点击热区，选中后精灵作出积极回应并自动进入魔镜。
 */
import { useEffect, useRef, useState } from 'react'
import { AudioEngine } from '../lib/audio'
import { IMAGES, SPRITES, SPRITE_KEYS } from '../lib/data'
import { createTimerBag, type TimerBag } from '../lib/timers'
import type { SpriteKey } from '../lib/types'

interface Props {
  active: boolean
  onPick: (key: SpriteKey) => void
  /** 选中精灵、回应播报完毕后进入魔镜（上层用穿越动效包裹） */
  onDone: () => void
}

export default function SpriteScene({ active, onPick, onDone }: Props) {
  const [picked, setPicked] = useState<SpriteKey | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  const activeRef = useRef(active)
  activeRef.current = active
  const bagRef = useRef<TimerBag | null>(null)

  useEffect(() => {
    if (!active) return
    AudioEngine.playVoice('/youyu/sao1.mp3')
  }, [active])

  // 离开该场景时清理未触发的延时
  useEffect(() => () => bagRef.current?.clear(), [])

  const choose = (key: SpriteKey) => {
    if (picked === key) return
    setPicked(key)
    pickRef.current(key)
    const sp = SPRITES[key]
    AudioEngine.chime(660)
    // 预生成 TTS 回应音走 playVoice 单实例通道，上一条（包括刚进场的 sao1）会被自动顶掉；
    // ended / error 任一触发都走 onEnd：真实时长控场景跳转，播放失败时回退到定时兜底。
    const onEnd = () => {
      bagRef.current?.clear()
      const bag = createTimerBag()
      bagRef.current = bag
      bag.later(() => {
        bag.clear()
        if (activeRef.current) doneRef.current()
      }, 1200)
    }
    AudioEngine.playVoice(sp.audio, { onEnded: onEnd, onError: onEnd })
  }

  const sp = picked ? SPRITES[picked] : null

  return (
    <section className={`scene${active ? ' active' : ''}`} id="scene-sprite">
      <div className="sprite-world" id="sprite-world">
        <div className="sprite-stage" id="sprite-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sprite-bg" src={IMAGES.spriteGroup} alt="五位情绪精灵" draggable={false} />
          {/* 精灵周围漂浮的音符 */}
          {[
            { n: '♪', x: 43, y: 54, d: 0 },   { n: '♫', x: 50, y: 51, d: 1.1 }, { n: '♩', x: 57, y: 54, d: 2.3 },  // happy
            { n: '♬', x: 12, y: 31, d: 0.6 },  { n: '♪', x: 24, y: 29, d: 2.5 },  // sad
            { n: '♫', x: 6,  y: 58, d: 1.3 },  { n: '♩', x: 18, y: 56, d: 3.0 },  // angry
            { n: '♪', x: 79, y: 58, d: 0.4 },  { n: '♬', x: 91, y: 56, d: 2.0 },  // anxious
            { n: '♩', x: 76, y: 29, d: 0.9 },  { n: '♫', x: 88, y: 27, d: 2.7 },  // numb
          ].map((s, i) => (
            <span key={`sn-${i}`} className="sprite-note" style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s` }}>{s.n}</span>
          ))}
          {SPRITE_KEYS.map((key) => {
            const s = SPRITES[key]
            return (
              <div
                key={key}
                className={`sprite-hot${picked === key ? ' picked' : ''}`}
                style={{ left: `${s.gpos.x}%`, top: `${s.gpos.y}%` }}
                onClick={() => choose(key)}
              >
                <span className="tag">{s.name} · {s.emo}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="sprite-title">
        <h2>你当下的状态，是什么样的？</h2>
        <p>五只小精灵正在朝你看 · 点击此刻最像你的那一只</p>
      </div>
      <div className={`sprite-respond${sp ? '' : ' hidden'}`} id="sprite-respond">
        {sp && (<><b>{sp.name}（{sp.emo}精灵）：</b>{sp.resp}</>)}
      </div>
    </section>
  )
}
