import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import FeedbackButton from '@/components/feedback/FeedbackButton'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Soulmates - 数字疗愈全流程管理平台',
  description: 'Soulmates是一款专为教师和学生设计的数字疗愈全流程管理平台。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
        <FeedbackButton />
      </body>
    </html>
  )
}