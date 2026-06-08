'use client'

import Link from 'next/link'
import Image from 'next/image'

interface AdminPageHeaderProps {
  subtitle?: string
  backHref?: string
  backLabel?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function AdminPageHeader({ subtitle, backHref, backLabel, action }: AdminPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#ebebeb] shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/logo.jpg"
              alt="Soulmates"
              width={40}
              height={40}
              className="w-10 h-10 object-contain rounded-lg"
              priority
            />
            <div>
              <h1 className="text-[16px] font-semibold text-[#222222] leading-tight">Soulmates</h1>
              {subtitle && <p className="text-[13px] text-[#6a6a6a] leading-tight">{subtitle}</p>}
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {backHref && (
              <Link
                href={backHref}
                className="h-10 px-5 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors inline-flex items-center gap-2"
              >
                {backLabel || '返回'}
              </Link>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="h-10 px-5 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41] transition-colors"
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
