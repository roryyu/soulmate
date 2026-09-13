'use client'

/** 穿越动效覆盖层（场景切换时的漩涡转场） */
interface Props {
  visible: boolean
}

export default function Vortex({ visible }: Props) {
  return (
    <div id="vortex" className={visible ? '' : 'hidden'}>
      <div className="vortex-swirl" />
    </div>
  )
}
