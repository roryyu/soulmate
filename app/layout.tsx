import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import FeedbackButton from '@/components/feedback/FeedbackButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '研灵犀 - 教育科研项目管理平台',
  description: '研灵犀是一款专为教师和学生设计的教育科研项目管理平台，帮助管理从创意到写作的全流程。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <FeedbackButton />
      </body>
    </html>
  )
}