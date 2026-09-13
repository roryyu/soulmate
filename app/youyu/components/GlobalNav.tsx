'use client'

/**
 * 全局导航：返回 / 跳过 按钮 + 音符收集盘
 * 按当前场景由上层决定各元素是否可见。
 */
interface Props {
  showBack: boolean
  showSkip: boolean
  onBack: () => void
  onSkip: () => void
  showTray: boolean
  noteCount: number
  goal: number
}

export default function GlobalNav({ showBack, showSkip, onBack, onSkip, showTray, noteCount, goal }: Props) {
  return (
    <>
      <button id="btn-back" className={showBack ? '' : 'hidden'} onClick={onBack}>‹</button>
      <button id="btn-skip" className={showSkip ? '' : 'hidden'} onClick={onSkip}>跳过 ›</button>
      <div id="note-tray" className={showTray ? '' : 'hidden'}>
        <span className="tray-ico">🎼</span><b id="note-count">{noteCount}</b><i>/{goal}</i>
      </div>
    </>
  )
}
