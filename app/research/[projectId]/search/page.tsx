'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Search,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Trash2,
  Clock,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { useProjectContext } from '../layout'
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

// 类型定义
type ResearchSearch = {
  id: string
  projectId: string
  userTopic: string
  cnkiQuery: string
  createdAt: Date
}

type ResearchIdea = {
  id: string
  projectId: string
  title: string
  rationale: string
  isAdopted: boolean
  createdAt: Date
}

// SSE 流式生成检索式
async function generateCnkiQueryApi(
  projectId: string,
  topic: string,
  onChunk: (chunk: string) => void,
  onDone: (result: { cnkiQuery: string; explanation: string }) => void,
  onError: (error: string) => void
) {
  const res = await fetch(`/api/research/projects/${projectId}/searches/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: '生成检索式失败' }))
    const message = (errorData as any)?.error || '生成检索式失败'
    // 中文注释：积分不足统一抛出带 code 的错误，页面层统一弹窗引导
    if (res.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
      const err: any = new Error(message)
      err.code = INSUFFICIENT_CREDITS_CODE
      throw err
    }
    throw new Error(message)
  }

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('无法读取响应流')
  }

  let fullResponse = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'chunk') {
              fullResponse += parsed.data
              onChunk(fullResponse)
            } else if (parsed.type === 'done') {
              onDone({ cnkiQuery: parsed.cnkiQuery, explanation: parsed.explanation })
            } else if (parsed.type === 'error') {
              onError(parsed.error)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// SSE 流式调整检索式
async function adjustQueryApi(
  projectId: string,
  data: { originalQuery: string; explanation?: string; adjustmentType: 'loosen' | 'tighten' },
  onChunk: (chunk: string) => void,
  onDone: (result: { cnkiQuery: string; explanation: string }) => void,
  onError: (error: string) => void
) {
  const res = await fetch(`/api/research/projects/${projectId}/searches/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: '调整检索式失败' }))
    const message = (errorData as any)?.error || '调整检索式失败'
    // 中文注释：积分不足统一抛出带 code 的错误，页面层统一弹窗引导
    if (res.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
      const err: any = new Error(message)
      err.code = INSUFFICIENT_CREDITS_CODE
      throw err
    }
    throw new Error(message)
  }

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('无法读取响应流')
  }

  let fullResponse = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'chunk') {
              fullResponse += parsed.data
              onChunk(fullResponse)
            } else if (parsed.type === 'done') {
              onDone({ cnkiQuery: parsed.cnkiQuery, explanation: parsed.explanation })
            } else if (parsed.type === 'error') {
              onError(parsed.error)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function saveSearchApi(projectId: string, data: { userTopic: string; cnkiQuery: string }) {
  const res = await fetch(`/api/research/projects/${projectId}/searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('保存检索记录失败')
  return res.json()
}

async function getSearchesApi(projectId: string): Promise<ResearchSearch[]> {
  const res = await fetch(`/api/research/projects/${projectId}/searches`)
  if (!res.ok) throw new Error('获取检索记录失败')
  return res.json()
}

async function deleteSearchApi(projectId: string, searchId: string) {
  const res = await fetch(`/api/research/projects/${projectId}/searches/${searchId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除检索记录失败')
  return res.json()
}

export default function SearchPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { projectInfo } = useProjectContext()
  const router = useRouter()

  // 表单状态
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')

  // 历史记录状态
  const [history, setHistory] = useState<ResearchSearch[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 当前选中的历史记录和调整状态
  const [selectedSearch, setSelectedSearch] = useState<ResearchSearch | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustingType, setAdjustingType] = useState<'loosen' | 'tighten' | null>(null)
  const [adjustingContent, setAdjustingContent] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletedId, setDeletedId] = useState<string | null>(null)
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; description?: string }>({
    open: false,
  })

  // 加载历史记录：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const searches = await getSearchesApi(projectId)
      setHistory(searches)
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [projectId])

  // 加载历史记录
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // 默认填充当前课题名称 - 当课题更新时立即同步
  useEffect(() => {
    if (projectInfo?.title) {
      setTopic(projectInfo.title)
    }
  }, [projectInfo?.title])

  // 生成检索式 - 支持 SSE 流式
  const handleGenerate = async () => {
    if (!topic.trim() || isGenerating) return

    setIsGenerating(true)
    setStreamingContent('')

    try {
      await generateCnkiQueryApi(
        projectId,
        topic.trim(),
        // onChunk - 实时更新流式内容
        (chunk) => {
          setStreamingContent(chunk)
        },
        // onDone - 处理最终结果
        async (result) => {
          // 保存到历史记录
          await saveSearchApi(projectId, {
            userTopic: topic.trim(),
            cnkiQuery: result.cnkiQuery,
          })

          // 刷新历史记录
          await loadHistory()
          setStreamingContent('')
        },
        // onError - 处理错误
        (error) => {
          console.error('生成检索式失败:', error)
          setStreamingContent('')
        }
      )
    } catch (error) {
      console.error('生成检索式失败:', error)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((error as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (error as any)?.message || '积分不足，无法生成检索式。请购买会员或充值积分后继续使用。',
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // 从历史记录恢复
  const handleRestoreFromHistory = (item: ResearchSearch) => {
    console.log('点击了历史记录项:', item)
    setTopic(item.userTopic)
  }

  // 调整检索式（变宽松或变严格）- 支持 SSE 流式
  const handleAdjustQuery = async (item: ResearchSearch, type: 'loosen' | 'tighten') => {
    setSelectedSearch(item)
    setAdjustingType(type)
    setIsAdjusting(true)
    setAdjustingContent('')

    try {
      await adjustQueryApi(
        projectId,
        {
          originalQuery: item.cnkiQuery,
          explanation: '',
          adjustmentType: type,
        },
        // onChunk
        (chunk) => {
          setAdjustingContent(chunk)
        },
        // onDone
        async (result) => {
          // 更新历史记录中的检索式
          await saveSearchApi(projectId, {
            userTopic: item.userTopic,
            cnkiQuery: result.cnkiQuery,
          })

          // 刷新历史记录
          await loadHistory()
          setAdjustingContent('')
        },
        // onError
        (error) => {
          console.error('调整检索式失败:', error)
          setAdjustingContent('')
        }
      )
    } catch (error) {
      console.error('调整检索式失败:', error)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((error as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (error as any)?.message || '积分不足，无法调整检索式。请购买会员或充值积分后继续使用。',
        })
      }
    } finally {
      setIsAdjusting(false)
      setSelectedSearch(null)
      setAdjustingType(null)
    }
  }

  // 删除历史记录
  const handleDeleteHistory = async (e: React.MouseEvent, item: ResearchSearch) => {
    e.stopPropagation()
    if (!confirm('确定要删除这条历史记录吗？')) return

    try {
      setDeletedId(item.id)
      await deleteSearchApi(projectId, item.id)
      await loadHistory()
      setTimeout(() => setDeletedId(null), 1500)
    } catch (error) {
      console.error('删除历史记录失败:', error)
      setDeletedId(null)
    }
  }

  // 键盘提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleGenerate()
    }
  }

  // 检查是否正在调整某个特定项
  const isAdjustingItem = (item: ResearchSearch) => {
    return isAdjusting && selectedSearch?.id === item.id
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Search className="text-[teal-600]" size={28} />
          文献检索
        </h1>
        {/* 副标题：说明本页价值与使用节奏 */}
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          围绕研究主题，梳理检索思路，逐步找到更相关的文献
        </p>
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/30">
          <p className="text-sm text-slate-800 font-medium mb-2">使用方法</p>
          <ol className="text-xs text-slate-500 space-y-3 list-decimal list-outside ml-4 pl-1">
            <li>
              在下方「研究主题」中输入内容，点击「生成检索式」
            </li>
            <li>
              <span className="block">
                复制生成的检索式 → 打开知网专业检索 → 粘贴到搜索框搜索
              </span>
              <a
                href="https://kns.cnki.net/kns8s/AdvSearch?type=expert&classid=YSTT4HG0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors mt-2"
              >
                <Search size={14} />
                打开知网专业检索
              </a>
            </li>
            <li>
              如需增加或减少文献数量，请调整检索范围，可使用「扩大范围」或「缩小范围」按钮优化检索式
            </li>
          </ol>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white rounded-xl border border-slate-200/40 p-6 mb-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-800 mb-2">
          研究主题
        </label>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：小学数学错题管理  或  初中物理实验教学"
              className="h-12 text-base bg-white border-slate-200 rounded-xl focus:ring-[teal-600] focus:border-[teal-600]"
              disabled={isGenerating}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            size="lg"
            className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          >
            {isGenerating ? (
              <Loading type="button" text="生成中..." isLoading={true} />
            ) : (
              <>
                <Sparkles size={20} className="mr-2" />
                生成检索式
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 流式生成预览 */}
      {isGenerating && streamingContent && (
        <div className="mb-6 bg-slate-50 rounded-xl border border-slate-200/40 p-4">
          <Loading type="inline" text="AI 正在生成检索式..." isLoading={true} className="mb-2" />
          <div className="text-sm text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
            {streamingContent}
            <span className="animate-pulse">▊</span>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            历史记录
          </h2>
          {history.length > 0 && (
            <span className="text-sm text-slate-500">
              共 {history.length} 条
            </span>
          )}
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loading type="inline" text="加载中..." isLoading={true} />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200/30">
            <Search size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">暂无历史记录</p>
            <p className="text-sm text-slate-400 mt-1">
              生成检索式后将自动保存到这里
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/30 p-4 hover:shadow-md hover:border-[teal-400]/30 transition-all cursor-pointer"
                onClick={() => handleRestoreFromHistory(item)}
              >
                {/* 调整中的流式预览 */}
                {isAdjustingItem(item) && adjustingContent && (
                  <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 size={14} className="animate-spin text-[teal-600]" />
                      <span className="text-xs text-slate-800">正在调整...</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono whitespace-pre-wrap">
                      {adjustingContent}
                      <span className="animate-pulse">▊</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">
                      {item.userTopic}
                    </p>
                    <p className="text-xs text-slate-500 font-mono whitespace-pre-wrap break-all">
                      {item.cnkiQuery}
                    </p>
                    {/* 调整按钮 */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAdjustQuery(item, 'loosen')
                        }}
                        disabled={isAdjustingItem(item)}
                      >
                        {isAdjustingItem(item) && adjustingType === 'loosen' ? (
                          <Loading type="button" text="" isLoading={true} />
                        ) : (
                          <>
                            <Maximize2 size={14} className="mr-1" />
                            扩大范围
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAdjustQuery(item, 'tighten')
                        }}
                        disabled={isAdjustingItem(item)}
                      >
                        {isAdjustingItem(item) && adjustingType === 'tighten' ? (
                          <Loading type="button" text="" isLoading={true} />
                        ) : (
                          <>
                            <Minimize2 size={14} className="mr-1" />
                            缩小范围
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {/* 复制按钮 */}
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={copiedId === item.id ? "text-green-600 hover:text-green-700" : "text-slate-400 hover:text-slate-800"}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(item.cnkiQuery)
                            .then(() => {
                              setCopiedId(item.id)
                              setTimeout(() => setCopiedId(null), 2000)
                            })
                            .catch((error) => {
                              console.error('复制失败:', error)
                            })
                        }}
                      >
                        {copiedId === item.id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                      {/* Tooltip 提示 */}
                      <div className={`absolute left-full ml-2 px-2 py-1 bg-[slate-800] text-white text-xs rounded-md whitespace-nowrap z-10 transition-opacity duration-200 ${copiedId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'}`}>
                        {copiedId === item.id ? '已复制' : '复制'}
                      </div>
                    </div>
                    {/* 删除按钮 */}
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={deletedId === item.id ? "text-red-300" : "text-slate-400 hover:text-red-500"}
                        onClick={(e) => handleDeleteHistory(e, item)}
                        disabled={deletedId === item.id}
                      >
                        {deletedId === item.id ? (
                          <Loading type="button" text="" isLoading={true} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </Button>
                      {/* Tooltip 提示 */}
                      <div className="absolute left-full ml-2 px-2 py-1 bg-[slate-800] text-white text-xs rounded-md whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 pointer-events-none">
                        删除
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InsufficientCreditsModal
        open={creditsModal.open}
        description={creditsModal.description}
        onClose={() => setCreditsModal({ open: false })}
        onGoPay={() => {
          setCreditsModal({ open: false })
          router.push('/payment')
        }}
      />
    </div>
  )
}
