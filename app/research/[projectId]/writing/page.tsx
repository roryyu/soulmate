'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText,
  Sparkles,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Layers,
  Zap,
  Download,
  ArrowRight,
  BookOpen,
  Search,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

// 类型定义
interface WritingItem {
  id: string
  projectId: string
  type: string
  content: string | null
  createdAt: string
  updatedAt: string
}

// 写作类型配置（包含前置依赖）
const WRITING_TYPES = [
  {
    type: 'concept_definition',
    name: '本项研究核心概念界定',
    description: '界定研究中的核心概念',
    icon: BookOpen,
    color: 'bg-slate-100 text-slate-600',
    dependencies: [],
  },
  {
    type: 'value',
    name: '研究价值',
    description: '梳理课题的理论价值与实践意义',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-600',
    dependencies: [],
  },
  {
    type: 'objective',
    name: '研究目标',
    description: '明确研究拟达成的目标',
    icon: Target,
    color: 'bg-blue-100 text-blue-600',
    dependencies: [],
  },
  {
    type: 'content',
    name: '研究内容',
    description: '梳理研究的主要内容',
    icon: Layers,
    color: 'bg-green-100 text-green-600',
    dependencies: [],
  },
  {
    type: 'method',
    name: '研究方法',
    description: '明确研究拟采用的方法',
    icon: Search,
    color: 'bg-cyan-100 text-cyan-600',
    dependencies: [],
  },
  {
    type: 'process',
    name: '研究过程',
    description: '规划研究的实施步骤和阶段',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-600',
    dependencies: ['objective', 'content', 'method'],
  },
  {
    type: 'key_problem',
    name: '本项目拟解决的关键问题',
    description: '分析研究需要突破的关键问题',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-600',
    dependencies: ['content'],
  },
  {
    type: 'innovation',
    name: '创新点',
    description: '说明课题的创新之处',
    icon: Zap,
    color: 'bg-purple-100 text-purple-600',
    dependencies: [],
  },
]

// API 函数
async function getWritingsApi(projectId: string): Promise<WritingItem[]> {
  const res = await fetch(`/api/research/projects/${projectId}/writings`)
  if (!res.ok) throw new Error('获取写作内容失败')
  return res.json()
}

// 获取项目信息
async function getProjectApi(projectId: string): Promise<{ title: string }> {
  const res = await fetch(`/api/research/projects/${projectId}`)
  if (!res.ok) throw new Error('获取项目信息失败')
  return res.json()
}

async function saveWritingApi(
  projectId: string,
  type: string,
  content: string
): Promise<WritingItem> {
  const res = await fetch(`/api/research/projects/${projectId}/writings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content }),
  })
  if (!res.ok) throw new Error('保存失败')
  return res.json()
}

// 加载状态
function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center">
            <Sparkles size={18} className="text-teal-600 animate-pulse" />
          </div>
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-teal-50 rounded animate-pulse" />
          <div className="h-4 bg-teal-50 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-teal-50 rounded animate-pulse" />
          <div className="h-4 bg-teal-50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// 写作卡片组件
function WritingCard({
  typeConfig,
  content,
  isGenerating,
  onGenerate,
  onSave,
  isDependenciesMet,
  missingDependencies,
}: {
  typeConfig: typeof WRITING_TYPES[0]
  content: WritingItem | null
  isGenerating: boolean
  onGenerate: () => void
  onSave: (content: string) => void
  isDependenciesMet: boolean
  missingDependencies: string[]
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [editContent, setEditContent] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const streamingDoneRef = useRef(false)

  const Icon = typeConfig.icon

  useEffect(() => {
    if (content?.content) {
      setEditContent(content.content)
    }
  }, [content])

  // 监听isGenerating状态来处理流式内容
  useEffect(() => {
    if (isGenerating) {
      setStreamingContent('')
      streamingDoneRef.current = false
    }
  }, [isGenerating])

  // 更新流式内容
  useEffect(() => {
    if (streamingContent && isGenerating) {
      setEditContent(streamingContent)
    }
  }, [streamingContent, isGenerating])

  const handleSave = async () => {
    if (!editContent.trim()) return
    setIsSaving(true)
    try {
      await onSave(editContent)
    } finally {
      setIsSaving(false)
    }
  }

  // 获取依赖名称
  const getDependencyName = (type: string) => {
    return WRITING_TYPES.find(t => t.type === type)?.name || type
  }

  return (
    <div className={`bg-white border border-slate-200/40 rounded-xl overflow-hidden shadow-sm ${!isDependenciesMet && !content?.content ? 'opacity-70' : ''}`}>
      {/* 头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-800">{typeConfig.name}</h3>
            <p className="text-xs text-slate-400">{typeConfig.description}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-slate-400" />
        ) : (
          <ChevronDown size={20} className="text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5">
          {/* 操作按钮 */}
          <div className="flex flex-col gap-2 mb-4">
            {/* 依赖提示 */}
            {!isDependenciesMet && !content?.content && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                <AlertCircle size={16} />
                <span>
                  请先生成：{missingDependencies.map(getDependencyName).join('、')}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onGenerate}
                disabled={isGenerating || (!isDependenciesMet && !content?.content)}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white disabled:bg-slate-300"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    {content?.content ? '重新生成' : '开始梳理'}
                  </>
                )}
              </Button>
              {content?.content && !isGenerating && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !editContent.trim()}
                  size="sm"
                  variant="outline"
                  className="border-slate-200"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  保存修改
                </Button>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          {isGenerating && !content?.content ? (
            <LoadingState />
          ) : (content?.content || isGenerating) ? (
            <div className="space-y-4">
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="在此编辑内容..."
                minHeight="250px"
                isGenerating={isGenerating}
              />
              {!isGenerating && content?.content && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>最后更新：{new Date(content.updatedAt).toLocaleString()}</span>
                  <span>字数：{content.content.length}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">点击上方按钮开始梳理</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 流式生成函数
async function* generateWritingStream(projectId: string, type: string) {
  const response = await fetch(`/api/research/projects/${projectId}/writings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })

  if (!response.ok) {
    throw new Error('生成失败')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // 处理接收到的内容
    if (buffer.includes('[DONE]')) {
      buffer = buffer.replace('[DONE]', '')
      break
    }

    if (buffer) {
      yield buffer
      buffer = ''
    }
  }
}

// 主页面组件
export default function WritingPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  // 状态
  const [writings, setWritings] = useState<WritingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingTypes, setGeneratingTypes] = useState<Set<string>>(new Set())
  const [streamedContent, setStreamedContent] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; description?: string }>({
    open: false,
  })

  // 加载写作内容：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const loadWritings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getWritingsApi(projectId)
      setWritings(data)
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // 加载写作内容
  useEffect(() => {
    loadWritings()
  }, [loadWritings])

  // 获取特定类型的内容
  const getWritingByType = (type: string): WritingItem | undefined => {
    return writings.find((w) => w.type === type)
  }

  // 获取流式内容
  const getStreamedContent = (type: string): string => {
    return streamedContent[type] || ''
  }

  // 检查依赖是否满足
  const checkDependencies = (typeConfig: typeof WRITING_TYPES[0]): { met: boolean; missing: string[] } => {
    const missing = typeConfig.dependencies.filter(depType => {
      const writing = getWritingByType(depType)
      return !writing?.content
    })
    return {
      met: missing.length === 0,
      missing,
    }
  }

  // 生成内容 - SSE流式版本（支持多个同时生成）
  const handleGenerate = async (type: string) => {
    // 如果已经在生成这个类型，则跳过
    if (generatingTypes.has(type)) return

    // 检查依赖是否满足
    const typeConfig = WRITING_TYPES.find(t => t.type === type)
    if (typeConfig) {
      const { met, missing } = checkDependencies(typeConfig)
      const existingContent = getWritingByType(type)
      if (!met && !existingContent?.content) {
        const missingNames = missing.map(depType => 
          WRITING_TYPES.find(t => t.type === depType)?.name || depType
        ).join('、')
        alert(`请先生成：${missingNames}`)
        return
      }
    }

    // 添加到正在生成的类型集合
    setGeneratingTypes(prev => new Set(prev).add(type))
    setStreamedContent(prev => ({ ...prev, [type]: '' }))

    try {
      const response = await fetch(`/api/research/projects/${projectId}/writings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        // 中文注释：402 积分不足时，后端返回 JSON（非 SSE），这里需要先解析再弹窗引导
        const errorData = await response.json().catch(() => ({ error: '生成失败' }))
        if (response.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
          const err: any = new Error((errorData as any)?.error || '积分不足，无法生成写作内容')
          err.code = INSUFFICIENT_CREDITS_CODE
          throw err
        }
        throw new Error((errorData as any)?.error || '生成失败')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('无法读取响应流')

      let fullResponse = ''

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
                setStreamedContent(prev => ({ ...prev, [type]: fullResponse }))
              } else if (parsed.type === 'done') {
                // 刷新列表获取保存的完整内容
                await loadWritings()
              } else if (parsed.type === 'error') {
                console.error('生成错误:', parsed.error)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (err) {
      console.error('生成失败:', err)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((err as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (err as any)?.message || '积分不足，无法生成写作内容。请购买会员或充值积分后继续使用。',
        })
      }
    } finally {
      // 从正在生成的类型集合中移除
      setGeneratingTypes(prev => {
        const newSet = new Set(prev)
        newSet.delete(type)
        return newSet
      })
    }
  }

  // 保存修改
  const handleSave = async (type: string, content: string) => {
    try {
      const result = await saveWritingApi(projectId, type, content)
      setWritings((prev) => {
        const filtered = prev.filter((w) => w.type !== type)
        return [result, ...filtered]
      })
    } catch (err) {
      console.error('保存失败:', err)
    }
  }

  // 一键导入到数字疗愈润色（论文润色模块）
  const handleExportToPolishing = async () => {
    // 检查是否有写作内容
    if (writings.length === 0 || !writings.some(w => w.content)) {
      alert('请先生成数字疗愈写作内容后再导入数字疗愈润色')
      return
    }

    try {
      setExporting(true)

      // 合并所有写作内容并去除Markdown格式
      const mergedContent = WRITING_TYPES.map(typeConfig => {
        const writing = writings.find(w => w.type === typeConfig.type)
        if (writing?.content) {
          // 去除Markdown格式的函数
          const removeMarkdown = (text: string) => {
            // 去除标题 #、##、### 等
            let cleanText = text.replace(/#+\n?/g, '')
            // 去除粗体 **
            cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1')
            // 去除斜体 *
            cleanText = cleanText.replace(/\*(.*?)\*/g, '$1')
            // 去除链接 [text](url)
            cleanText = cleanText.replace(/\[(.*?)\]\(.*?\)/g, '$1')
            // 去除图片 ![]()
            cleanText = cleanText.replace(/!\[.*?\]\(.*?\)/g, '')
            // 去除代码块 ```
            cleanText = cleanText.replace(/```[\s\S]*?```/g, '')
            // 去除行内代码 `
            cleanText = cleanText.replace(/`(.*?)`/g, '$1')
            // 去除列表符号
            cleanText = cleanText.replace(/^[\*\+-]\s+/gm, '')
            // 去除引用 >
            cleanText = cleanText.replace(/^>\s+/gm, '')
            // 去除水平线 ---
            cleanText = cleanText.replace(/^---\s*$/gm, '')
            // 去除多余的空行
            cleanText = cleanText.replace(/\n{3,}/g, '\n\n')
            return cleanText.trim()
          }
          
          const cleanContent = removeMarkdown(writing.content)
          return `【${typeConfig.name}】\n${cleanContent}`
        }
        return ''
      }).filter(Boolean).join('\n\n---\n\n')

      if (!mergedContent.trim()) {
        alert('没有可导入的内容')
        return
      }

      // 获取项目信息，使用项目标题作为论文标题
      const projectInfo = await getProjectApi(projectId)
      const projectTitle = projectInfo.title || '研究写作内容'

      // 保存到论文润色模块
      await fetch(`/api/research/projects/${projectId}/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          content: mergedContent,
        }),
      })

      // 跳转到论文润色页面
      router.push(`/research/${projectId}/polishing`)
    } catch (err) {
      console.error('导入失败:', err)
      alert('导入失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  // 合并显示内容（数据库内容 + 流式内容）
  const getDisplayContent = (type: string): WritingItem | null => {
    const dbContent = getWritingByType(type)
    const streamContent = getStreamedContent(type)

    if (streamContent && generatingTypes.has(type)) {
      // 正在流式生成，显示流式内容
      return {
        id: dbContent?.id || '',
        projectId,
        type,
        content: streamContent,
        createdAt: dbContent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    return dbContent || null
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-teal-600" size={28} />
            数字疗愈写作
          </h1>
          <p className="text-slate-500 mt-1">
            围绕课题申报核心内容，逐步梳理课题研究思路与表达
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleExportToPolishing}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-teal-600 border border-[teal-600] rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            导入数字疗愈润色
          </button>
          <span className="text-xs text-slate-400">将已梳理内容汇总进入润色整理</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <LoadingState />
          <LoadingState />
          <LoadingState />
          <LoadingState />
        </div>
      ) : (
        <div className="space-y-4">
          {WRITING_TYPES.map((typeConfig) => {
            const { met: isDependenciesMet, missing: missingDependencies } = checkDependencies(typeConfig)
            return (
              <WritingCard
                key={typeConfig.type}
                typeConfig={typeConfig}
                content={getDisplayContent(typeConfig.type)}
                isGenerating={generatingTypes.has(typeConfig.type)}
                onGenerate={() => handleGenerate(typeConfig.type)}
                onSave={(content) => handleSave(typeConfig.type, content)}
                isDependenciesMet={isDependenciesMet}
                missingDependencies={missingDependencies}
              />
            )
          })}
        </div>
      )}

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
