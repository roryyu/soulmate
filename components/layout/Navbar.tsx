'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  Settings,
  LogOut,
  User,
  Crown,
  CreditCard,
  Receipt,
  ClipboardList,
} from 'lucide-react'

function Navbar({ currentPath }: { currentPath?: string }) {
  const { data: session, status } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-200 ${
        scrolled ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)]' : 'border-b border-[#ebebeb]'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
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
              <p className="text-[13px] text-[#6a6a6a] leading-tight">数字疗愈全流程管理</p>
            </div>
          </Link>

          {/* 右侧用户区域 */}
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <div className="text-[14px] text-[#929292]">加载中...</div>
            ) : session ? (
              <div className="flex items-center gap-3">
                <Link href="/admin/prescription">
                  <button className="h-12 px-6 rounded-lg bg-[#ff385c] text-white text-[16px] font-medium hover:bg-[#e00b41] transition-colors">
                    疗愈处方
                  </button>
                </Link>

                {/* 用户头像下拉 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-2 rounded-full border border-[#dddddd] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] transition-shadow"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center text-white font-medium text-sm">
                      {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#222222] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] border border-[#ebebeb] overflow-hidden">
                      {/* 用户信息 */}
                      <div className="px-4 py-3 border-b border-[#ebebeb]">
                        <p className="text-[14px] font-semibold text-[#222222]">{session.user?.name || '用户'}</p>
                        <p className="text-[13px] text-[#6a6a6a] truncate">{session.user?.email}</p>
                      </div>

                      <div className="py-2">
                        <Link
                          href="/admin/prescription"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
                        >
                          <User className="w-4 h-4 text-[#6a6a6a]" />
                          处方管理
                        </Link>

                        {session?.user?.role === 'ADMIN' && (
                          <>
                            <Link
                              href="/admin/music"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
                            >
                              <User className="w-4 h-4 text-[#6a6a6a]" />
                              音乐生成
                            </Link>
                            <Link
                              href="/admin/toc-data"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
                            >
                              <User className="w-4 h-4 text-[#6a6a6a]" />
                              音乐素材
                            </Link>
                          </>
                        )}

                        <div className="my-2 border-t border-[#ebebeb]" />

                        <button
                          onClick={() => {
                            setDropdownOpen(false)
                            signOut({ callbackUrl: '/?logout=true' })
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-[#6a6a6a]" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="h-12 px-6 rounded-lg bg-[#ff385c] text-white text-[16px] font-medium hover:bg-[#e00b41] transition-colors"
                onClick={() => signIn(undefined, { callbackUrl: '/admin/prescription' })}
              >
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
