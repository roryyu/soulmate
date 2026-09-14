'use client'

/**
 * 场景 6：音乐公园 / 音乐博物馆（共用组件）
 * - 竖向拖拽平移背景（6px 阈值，拖拽后吞掉一次 click 避免误触音符）
 * - 散落 12 枚音符，点击交由上层弹出答题
 * - 环境声景开关（park=鸟鸣流水 / museum=殿堂低吟）
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AudioEngine } from '../lib/audio'
import { NOTE_GLYPHS, WORLD } from '../lib/data'
import type { PlaceKey } from '../lib/types'

interface Props {
  active: boolean
  place: PlaceKey
  /** 已收集的音符 id 集合（形如 "park-0"） */
  collected: Set<string>
  onNoteClick: (noteId: string, el: HTMLElement) => void
}

const TOP_COPY: Record<PlaceKey, { title: string; sub: string; amb: string }> = {
  park: {
    title: '🌿 有屿音乐公园',
    sub: '场景内散落 12 枚音符 · 收集它的心声（也可在两处凑齐 12 枚）',
    amb: '🔊 自然声景',
  },
  museum: {
    title: '🏛 有屿音乐博物馆',
    sub: '唤醒 12 枚沉睡的音符 · 也可与公园凑齐 12 枚',
    amb: '🔊 殿堂声景',
  },
}

export default function PlaceScene({ active, place, collected, onNoteClick }: Props) {
  const vpRef = useRef<HTMLDivElement | null>(null)
  const bgRef = useRef<HTMLImageElement | null>(null)
  const clickRef = useRef(onNoteClick)
  clickRef.current = onNoteClick
  const [ambOn, setAmbOn] = useState(false)
  const def = WORLD[place]
  const copy = TOP_COPY[place]

  // 每枚音符的浮动周期（稳定，不随重渲染变化）
  const durations = useMemo(
    () => def.notes.map(() => `${(2.8 + Math.random() * 1.6).toFixed(2)}s`),
    [def]
  )

  /* ---- 进入即播放环境声景，离开则停止 ---- */
  useEffect(() => {
    if (!active) return
    AudioEngine.ambient(def.ambient)
    setAmbOn(true)
    return () => { AudioEngine.stopAmbient(); setAmbOn(false) }
  }, [active, def])

  /* ---- 竖向拖拽平移 ---- */
  useEffect(() => {
    if (!active) return
    const vp = vpRef.current
    const el = bgRef.current
    if (!vp || !el) return
    el.style.translate = '0px 0px'
    let startY = 0
    let startT = 0
    let curT = 0
    let pressing = false
    let moved = false
    const clamp = (v: number) => {
      const lim = Math.max(0, el.offsetHeight - vp.offsetHeight)
      return Math.min(0, Math.max(-lim, v))
    }
    const onMove = (e: PointerEvent) => {
      if (!pressing) return
      const dy = e.clientY - startY
      if (!moved && Math.abs(dy) > 6) moved = true
      if (moved) {
        curT = clamp(startT + dy)
        el.style.translate = `0 ${curT}px`
      }
    }
    const swallow = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault() }
    const onUp = () => {
      if (!pressing) return
      pressing = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (moved) vp.addEventListener('click', swallow, { capture: true, once: true })
    }
    const onDown = (e: PointerEvent) => {
      pressing = true
      moved = false
      startY = e.clientY
      startT = curT
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
    vp.addEventListener('pointerdown', onDown)
    return () => {
      vp.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [active])

  const toggleAmb = () => {
    if (ambOn) { AudioEngine.stopAmbient(); setAmbOn(false) }
    else { AudioEngine.ambient(def.ambient); setAmbOn(true) }
  }

  return (
    <section className={`scene${active ? ' active' : ''}`} id={`scene-${place}`}>
      <div className="place-viewport" data-place={place} ref={vpRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="place-bg" src={def.bg} alt={def.name} ref={bgRef} />
        <div className="place-notes" id={`notes-${place}`}>
          {def.notes.map((n, i) => {
            const id = `${place}-${i}`
            if (collected.has(id)) return null
            return (
              <div
                key={id}
                className="note-hot"
                data-id={id}
                style={{ left: `${n.x}%`, top: `${n.y}%`, '--d': durations[i] } as CSSProperties}
                onClick={(e) => clickRef.current(id, e.currentTarget)}
              >
                {NOTE_GLYPHS[i % 4]}
              </div>
            )
          })}
        </div>
      </div>
      <div className="place-top">
        <b>{copy.title}</b><span>{copy.sub}</span>
      </div>
      <button className={`amb-btn${ambOn ? ' on' : ''}`} id={`amb-${place}`} onClick={toggleAmb}>
        {copy.amb}
      </button>
    </section>
  )
}
