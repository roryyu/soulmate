'use client'

import dynamic from 'next/dynamic'
import './linjian.css'

// 应用初始状态依赖 window 与 localStorage，禁用 SSR 仅在客户端渲染
const ForestConcertApp = dynamic(() => import('./ForestConcertApp'), {
  ssr: false,
  loading: () => <div className="page-loader">正在进入林间音乐会...</div>,
})

export default function LinjianPage() {
  return <ForestConcertApp />
}
