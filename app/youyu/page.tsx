'use client'

import dynamic from 'next/dynamic'
import './youyu.css'

// 应用依赖 window / navigator / WebAudio / getUserMedia，禁用 SSR，仅在客户端渲染
const YouyuApp = dynamic(() => import('./YouyuApp'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100dvh', display: 'grid', placeItems: 'center',
        background: '#070b26', color: '#8e97c9',
        fontFamily: '"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif',
        letterSpacing: '2px', fontSize: 13,
      }}
    >
      正在进入有屿…
    </div>
  ),
})

export default function YouyuPage() {
  return <YouyuApp />
}
