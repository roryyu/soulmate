import React from 'react'
import { Loader2, Sparkles, Brain, Upload, CheckCircle, AlertCircle } from 'lucide-react'

// 加载组件类型
type LoadingType = 'default' | 'button' | 'fullscreen' | 'inline' | 'progress'

type LoadingSize = 'sm' | 'md' | 'lg'

interface LoadingProps {
  // 加载类型
  type?: LoadingType
  // 图标大小
  size?: LoadingSize
  // 加载文本
  text?: string
  // 加载中状态
  isLoading: boolean
  // 进度（仅在type为'progress'时使用）
  progress?: number
  // 成功状态（仅在type为'fullscreen'时使用）
  isSuccess?: boolean
  // 失败状态（仅在type为'fullscreen'时使用）
  isError?: boolean
  // 成功文本
  successText?: string
  // 失败文本
  errorText?: string
  // 额外的CSS类
  className?: string
}

/**
 * 统一的加载组件
 * 支持多种加载状态和显示方式
 */
export function Loading({ 
  type = 'default', 
  size = 'md',
  text = '加载中...', 
  isLoading, 
  progress, 
  isSuccess = false, 
  isError = false, 
  successText = '操作成功', 
  errorText = '操作失败',
  className = '' 
}: LoadingProps) {
  // 根据 size 配置图标像素大小
  const sizeMap = { sm: 16, md: 24, lg: 32 }
  const iconSize = sizeMap[size]

  // 按钮加载状态
  if (type === 'button' && isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 size={iconSize} className="animate-spin text-current" />
        <span>{text}</span>
      </div>
    )
  }

  // 内联加载状态
  if (type === 'inline' && isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 size={iconSize} className="animate-spin text-teal-600" />
        <span className="text-sm text-slate-500">{text}</span>
      </div>
    )
  }

  // 进度条加载状态
  if (type === 'progress' && isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-teal-600 animate-pulse" />
            <span className="text-xs text-slate-400">{text}</span>
          </div>
          <span className="text-xs text-slate-400">{progress || 0}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
      </div>
    )
  }

  // 全屏加载状态
  if (type === 'fullscreen' && (isLoading || isSuccess || isError)) {
    const isCompleted = isSuccess || isError
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${ 
              isSuccess ? 'bg-green-100' : isError ? 'bg-red-100' : 'bg-teal-100' 
            }`}>
              {isSuccess ? (
                <CheckCircle size={24} className="text-green-600" />
              ) : isError ? (
                <AlertCircle size={24} className="text-red-600" />
              ) : (
                <Upload size={24} className="text-teal-600 animate-bounce" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {isSuccess ? successText : isError ? errorText : text}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {isSuccess 
                  ? '操作已成功完成' 
                  : isError 
                    ? '请检查后重试' 
                    : '请稍候，系统正在处理...'}
              </p>
            </div>
          </div>

          {!isCompleted && (
            <div className="space-y-3">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full animate-pulse w-2/3" />
              </div>
              
              {text.includes('上传') && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                  <Brain size={14} className="text-teal-500" />
                  <span>上传完成后将自动开始处理</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 默认加载状态
  if (isLoading) {
    return (
      <div className={`bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[teal-400]/20 flex items-center justify-center">
            <Sparkles size={18} className="text-teal-600 animate-pulse" />
          </div>
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-[teal-50] rounded animate-pulse" />
          <div className="h-4 bg-[teal-50] rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-[teal-50] rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return null
}

/**
 * 按钮加载状态Hook
 * 用于管理按钮的加载状态
 */
export function useLoading() {
  const [isLoading, setIsLoading] = React.useState(false)
  
  const startLoading = () => setIsLoading(true)
  const stopLoading = () => setIsLoading(false)
  
  return { isLoading, startLoading, stopLoading }
}
