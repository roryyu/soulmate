'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sparkles, Loader2, Check, X, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { useProjectContext } from '../layout'
import { parseLLMJson } from '@/lib/utils/json'
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

// 选题类型
interface ResearchIdea {
  id?: string
  title: string
  rationale: string
  isAdopted?: boolean
  createdAt?: string | Date
}

// API 调用函数 - 使用 SSE 流式
async function generateIdeasApi(projectId: string, keywords: string, onChunk: (chunk: string) => void, onDone: (ideas: ResearchIdea[]) => void, onError: (error: string) => void) {
  const res = await fetch(`/api/research/projects/${projectId}/ideas/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: '生成选题失败' }))
    const message = (errorData as any)?.error || '生成选题失败'
    // 中文注释：对“积分不足”做结构化抛错，便于页面统一弹窗引导购买
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
              // 使用健壮的 JSON 解析器处理大模型返回的数据
              const ideas = parseLLMJson<ResearchIdea[]>(JSON.stringify(parsed.ideas || []))
              onDone(Array.isArray(ideas) ? ideas : [])
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

async function saveIdeaApi(projectId: string, data: { title: string; rationale: string; isAdopted?: boolean }) {
  const res = await fetch(`/api/research/projects/${projectId}/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('保存选题失败')
  return res.json()
}

async function updateProjectTitleApi(projectId: string, title: string) {
  const res = await fetch(`/api/research/projects/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('更新课题标题失败')
  return res.json()
}

async function deleteIdeaApi(projectId: string, ideaId: string) {
  const res = await fetch(`/api/research/projects/${projectId}/ideas/${ideaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除选题失败')
  return res.json()
}

// 更新选题
async function updateIdeaApi(projectId: string, ideaId: string, data: { isAdopted?: boolean; title?: string; rationale?: string }) {
  const res = await fetch(`/api/research/projects/${projectId}/ideas/${ideaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('更新选题失败')
  return res.json()
}

// 获取已采纳的选题
async function getAdoptedIdeasApi(projectId: string) {
  console.log('开始获取已采纳选题，projectId:', projectId)
  try {
    const res = await fetch(`/api/research/projects/${projectId}/ideas`)
    console.log('获取已采纳选题响应状态:', res.status)
    if (!res.ok) throw new Error('获取已采纳选题失败')
    const data = await res.json()
    console.log('获取已采纳选题响应数据:', data)
    return data
  } catch (error) {
    console.error('获取已采纳选题错误:', error)
    throw error
  }
}

export default function IdeationPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { refreshProjectInfo, projectInfo } = useProjectContext()
  const router = useRouter()

  const [keywords, setKeywords] = useState('')
  const [ideas, setIdeas] = useState<ResearchIdea[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [adoptingId, setAdoptingId] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; description?: string }>({
    open: false,
  })

  // 当项目信息加载完成时，将description设置为默认关键词
  useEffect(() => {
    if (projectInfo?.description) {
      setKeywords(projectInfo.description)
    }
  }, [projectInfo])

  // 加载已采纳的选题
  useEffect(() => {
    const loadAdoptedIdeas = async () => {
      setIsLoadingHistory(true)
      try {
        console.log('开始加载已采纳选题')
        const result = await getAdoptedIdeasApi(projectId)
        console.log('获取到的已采纳选题:', result)
        // 检查 result 是否是数组（后端直接返回数组）
        if (Array.isArray(result)) {
          console.log('已采纳选题数量:', result.length)
          setIdeas(result)
          setHasGenerated(true)
          console.log('状态更新完成')
        } else if (result && result.ideas) {
          // 兼容旧的格式（如果后端返回{ ideas: ideas }对象）
          console.log('已采纳选题数量:', result.ideas.length)
          setIdeas(result.ideas)
          setHasGenerated(true)
          console.log('状态更新完成')
        }
      } catch (error) {
        console.error('获取已采纳选题失败:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadAdoptedIdeas()
  }, [projectId])

  // 生成选题 - 支持 SSE 流式
  const handleGenerate = async () => {
    if (!keywords.trim() || isGenerating) return

    setIsGenerating(true)
    setStreamingContent('')

    try {
      await generateIdeasApi(
        projectId,
        keywords.trim(),
        // onChunk - 实时更新流式内容
        (chunk) => {
          setStreamingContent(chunk)
        },
        // onDone - 处理最终结果
        async (generatedIdeas) => {
          // 处理返回的数据，确保 title 和 rationale 是字符串格式
          const processedIdeas = (generatedIdeas || []).map((idea: any) => {
            let title = idea.title
            let rationale = idea.rationale

            // 去除多余的引号
            if (typeof title === 'string') {
              title = title.replace(/^"|"$/g, '')
            }
            if (typeof rationale === 'string') {
              rationale = rationale.replace(/^"|"$/g, '')
            }

            return {
              title,
              rationale
            }
          })

          // 将所有新生成的选题保存到数据库
          const savedNewIdeas: ResearchIdea[] = []
          for (const idea of processedIdeas) {
            // 检查是否已经存在
            const existingIdea = ideas.find(i => i.title === idea.title)
            if (!existingIdea) {
              const savedIdea = await saveIdeaApi(projectId, {
                title: idea.title,
                rationale: idea.rationale,
                isAdopted: false,
              })
              savedNewIdeas.push(savedIdea)
            }
          }

          // 将新保存的选题与已有的历史选题合并
          setIdeas((prevIdeas) => {
            const existingTitles = new Set(prevIdeas.map(idea => idea.title))
            const newIdeas = savedNewIdeas.filter(idea => !existingTitles.has(idea.title))
            return [...prevIdeas, ...newIdeas]
          })
          setHasGenerated(true)
          setStreamingContent('')
        },
        // onError - 处理错误
        (error) => {
          console.error('生成选题失败:', error)
          setStreamingContent('')
        }
      )
    } catch (error) {
      console.error('生成选题失败:', error)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((error as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (error as any)?.message || '积分不足，无法生成选题。请购买会员或充值积分后继续使用。',
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // 采纳选题
  const handleAdopt = async (idea: ResearchIdea) => {
    if (adoptingId) return

    setAdoptingId(idea.title)
    try {
      // 1. 先获取其他已采纳的选题
      const otherAdoptedIdeas = ideas.filter((i) => i.isAdopted && i.id && i.title !== idea.title)

      // 2. 先立即更新本地状态，让UI立即响应
      setIdeas((prev) =>
        prev.map((i) => {
          if (i.title === idea.title) {
            return { ...i, isAdopted: true }
          }
          // 其他选题取消采纳状态
          return { ...i, isAdopted: false }
        })
      )

      let savedIdea

      // 3. 保存或更新当前选题
      if (idea.id) {
        savedIdea = await updateIdeaApi(projectId, idea.id, { isAdopted: true })
      } else {
        savedIdea = await saveIdeaApi(projectId, {
          title: idea.title,
          rationale: idea.rationale,
          isAdopted: true,
        })
      }

      // 4. 更新其他已采纳选题的状态
      for (const adoptedIdea of otherAdoptedIdeas) {
        if (adoptedIdea.id) {
          await updateIdeaApi(projectId, adoptedIdea.id, { isAdopted: false })
        }
      }

      // 5. 更新项目标题
      await updateProjectTitleApi(projectId, idea.title)

      // 6. 刷新项目信息
      refreshProjectInfo()

      // 7. 更新id
      setIdeas((prev) =>
        prev.map((i) => {
          if (i.title === idea.title) {
            return { ...i, id: savedIdea.id }
          }
          return i
        })
      )
    } catch (error) {
      console.error('采纳选题失败:', error)
      // 出错时重新加载
      const result = await getAdoptedIdeasApi(projectId)
      if (Array.isArray(result)) {
        setIdeas(result)
      } else if (result && result.ideas) {
        setIdeas(result.ideas)
      }
    } finally {
      setAdoptingId(null)
    }
  }

  // 取消采纳
  const handleUnadopt = async (idea: ResearchIdea) => {
    if (!idea.id || adoptingId) return

    setAdoptingId(idea.title)
    try {
      // 先立即更新本地状态
      setIdeas((prev) =>
        prev.map((i) =>
          i.title === idea.title
            ? { ...i, isAdopted: false }
            : i
        )
      )

      // 再更新数据库
      await updateIdeaApi(projectId, idea.id, { isAdopted: false })
    } catch (error) {
      console.error('取消采纳失败:', error)
      // 出错时重新加载
      const result = await getAdoptedIdeasApi(projectId)
      if (Array.isArray(result)) {
        setIdeas(result)
      } else if (result && result.ideas) {
        setIdeas(result.ideas)
      }
    } finally {
      setAdoptingId(null)
    }
  }

  // 多行输入：Enter 换行，Ctrl/Cmd+Enter 提交
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="text-teal-600" size={28} />
          选题构思
        </h1>
        <p className="text-slate-500] mt-1">
        输入研究关键词或研究需求，梳理5个可研究的问题方向
        </p>
      </div>

      {/* 输入区域 */}
      <Card className="mb-6 border-slate-200]/40 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">
              研究设想:请结合教学实际，写下您的研究线索
              </label>
              <Textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如:任教学科、学段年级、真实问题学生表现、已做过的尝试、想改进的方向等。内容越具体，选题梳理越贴近您的教学实际。"
                rows={5}
                className="min-h-[120px] resize-y text-base bg-white border-slate-200 rounded-xl focus-visible:ring-teal-600 focus-visible:border-teal-600"
                disabled={isGenerating}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!keywords.trim() || isGenerating}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <>
                <Sparkles size={18} className="mr-2" />
                梳理研究问题
              </>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 流式生成预览 */}
      {isGenerating && streamingContent && (
        <Card className="mb-6 border-slate-200/40 bg-slate-50">
          <CardContent className="pt-6">
            <Loading type="inline" text="AI 正在生成选题..." isLoading={true} className="mb-2" />
            <div className="text-sm text-slate-500] whitespace-pre-wrap leading-relaxed">
              {streamingContent}
              <span className="animate-pulse">▊</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 选题结果 */}
      {(hasGenerated || isLoadingHistory) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <BookOpen size={20} className="text-teal-600" />
              历史选题
            </h2>
            <span className="text-sm text-slate-500]">
              已采纳 {ideas.filter((i) => i.isAdopted).length} 个
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loading type="inline" text="加载历史选题中..." isLoading={true} />
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-8 text-slate-500]">
              还未生成过选题
            </div>
          ) : (
            <div className="space-y-3">
              {[...ideas]
                .sort((a, b) => {
                  // 已采纳的选题放第一个
                  if (a.isAdopted && !b.isAdopted) return -1
                  if (!a.isAdopted && b.isAdopted) return 1
                  // 其他按时间倒序
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                  return timeB - timeA
                })
                .map((idea, index) => (
                  <Card
                    key={idea.id || index}
                    className={`transition-all border-slate-200]/40 ${
                      idea.isAdopted
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'hover:border-teal-400/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-400/20 text-teal-600 text-sm font-medium flex-shrink-0">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-slate-800 break-words">
                              {idea.title}
                              <span className="text-xs text-slate-400 ml-2 font-normal">
                                ({idea.title.length}字)
                              </span>
                            </h4>
                          </div>
                          <div className="text-xs text-slate-400] pl-8 mb-2">
                            {idea.createdAt ? new Date(idea.createdAt).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </div>
                          <p className="text-sm text-slate-500] leading-relaxed pl-8">
                            {idea.rationale}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {idea.isAdopted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnadopt(idea)}
                                  disabled={!!adoptingId}
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl"
                                >
                                  {adoptingId === idea.title ? (
                                    <Loading type="button" text="" isLoading={true} />
                                  ) : (
                                    <>
                                      <X size={14} />
                                      <span className="ml-1">取消</span>
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAdopt(idea)}
                                  disabled={!!adoptingId}
                                  className="bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg transition-all rounded-xl"
                                >
                                  {adoptingId === idea.title ? (
                                    <Loading type="button" text="" isLoading={true} />
                                  ) : (
                                    <>
                                      <Check size={14} />
                                      <span className="ml-1">采纳</span>
                                    </>
                                  )}
                                </Button>
                              )}
                        </div>
                      </div>
                      {idea.isAdopted && (
                        <div className="mt-3 pl-8 flex items-center gap-2 text-xs text-emerald-600">
                          <Check size={12} />
                          已采纳为课题标题
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
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
