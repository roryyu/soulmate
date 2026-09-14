'use client'

/**
 * 场景 5：有屿·世界地图
 * 两张门（公园 / 博物馆）+ 指针视差；精灵头像取自当前情绪。
 */
import { useEffect, useRef } from 'react'
import { IMAGES, SPRITES, WORLD } from '../lib/data'
import type { PlaceKey, SpriteKey } from '../lib/types'

interface Props {
  active: boolean
  emo: SpriteKey | null
  onEnter: (place: PlaceKey) => void
}

export default function WorldScene({ active, emo, onEnter }: Props) {
  const vpRef = useRef<HTMLDivElement | null>(null)
  const bgRef = useRef<HTMLImageElement | null>(null)
  const enterRef = useRef(onEnter)
  enterRef.current = onEnter
  const sp = SPRITES[emo ?? 'happy']

  useEffect(() => {
    if (!active) return
    const vp = vpRef.current
    const bg = bgRef.current
    if (!vp || !bg) return
    const onMove = (e: PointerEvent) => {
      const r = vp.getBoundingClientRect()
      const dx = (e.clientX - r.left) / r.width - 0.5
      const dy = (e.clientY - r.top) / r.height - 0.5
      bg.style.transform = `translate(${dx * -10}px, ${dy * -8}px) scale(1.03)`
    }
    vp.addEventListener('pointermove', onMove)
    return () => vp.removeEventListener('pointermove', onMove)
  }, [active])

  return (
    <section className={`scene${active ? ' active' : ''}`} id="scene-world">
      <div className="world-viewport" id="world-viewport" ref={vpRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="world-bg" src={IMAGES.world} alt="有屿" ref={bgRef} />
        <div
          className="world-door" id="door-park"
          style={{ left: `${WORLD.park.door.x}%`, top: `${WORLD.park.door.y}%` }}
          onClick={() => enterRef.current('park')}
        >
          <b>有屿音乐公园</b><span>自然声景 · 散落着野生音符</span><em>进入 ›</em>
        </div>
        <div
          className="world-door" id="door-museum"
          style={{ left: `${WORLD.museum.door.x}%`, top: `${WORLD.museum.door.y}%` }}
          onClick={() => enterRef.current('museum')}
        >
          <b>有屿音乐博物馆</b><span>百年乐章 · 沉睡的音符等待唤醒</span><em>进入 ›</em>
        </div>
      </div>
      <div className="world-hint">
        <div className="md-sprite" id="world-sprite" style={{ backgroundImage: `url(${sp.img})` }} />
        <div className="bubble" id="world-bubble">
          欢迎来到<b>有屿</b> ✦<br />音符从宇宙洒落到这里的每个角落，<br />去公园和博物馆走走，收集 12 枚属于你的音符吧！
        </div>
      </div>
    </section>
  )
}
