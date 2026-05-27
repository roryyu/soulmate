'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectContext } from '../layout'
import {
  FileText,
  Sparkles,
  Copy,
  Download,
  FileStack,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { saveAs } from 'file-saver'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

// 类型定义
interface ResearchDocument {
  id: string
  projectId: string
  fileName: string
  fileType: string
  content: string | null
  createdAt: string
}

interface SourceDoc {
  docId: string
  fileName: string
}

interface ResearchOutline {
  id: string
  projectId: string
  title: string
  content: string
  sourceDocs: string | SourceDoc[]
  status: string
  createdAt: string
  updatedAt: string
}

// API 函数
async function getDocumentsApi(projectId: string): Promise<ResearchDocument[]> {
  const res = await fetch(`/api/research/projects/${projectId}/documents`)
  if (!res.ok) throw new Error('获取文档列表失败')
  return res.json()
}

async function getOutlinesApi(projectId: string): Promise<ResearchOutline[]> {
  const res = await fetch(`/api/research/projects/${projectId}/outlines`)
  if (!res.ok) throw new Error('获取大纲列表失败')
  return res.json()
}

async function deleteOutlineApi(projectId: string, outlineId: string): Promise<void> {
  const res = await fetch(`/api/research/projects/${projectId}/outlines/${outlineId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除大纲失败')
}

// 主页面组件
export default function OutlinesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { projectInfo, projectTitleUpdated } = useProjectContext()
  const router = useRouter()

  // 状态
  const [documents, setDocuments] = useState<ResearchDocument[]>([])
  const [outlines, setOutlines] = useState<ResearchOutline[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [focusTopic, setFocusTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentOutline, setCurrentOutline] = useState<ResearchOutline | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; description?: string }>({
    open: false,
  })

  // 监听课题标题变化，同步更新聚焦主题
  useEffect(() => {
    if (projectInfo?.title) {
      // 默认使用项目题目作为聚焦主题
      setFocusTopic(projectInfo.title)
    }
  }, [projectInfo?.title, projectTitleUpdated])

  // 加载大纲详情：用 useCallback 固定引用，方便被 loadData 依赖
  const loadOutlineDetail = useCallback(async (outlineId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/research/projects/${projectId}/outlines/${outlineId}`)
      if (res.ok) {
        const outline = await res.json()
        setCurrentOutline(outline)
        setEditContent(outline.content || '')
      }
    } catch (err) {
      console.error('加载大纲详情失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // 加载页面数据：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [docs, outlinesData] = await Promise.all([
        getDocumentsApi(projectId),
        getOutlinesApi(projectId),
      ])
      setDocuments(docs)
      setOutlines(outlinesData)

      // 默认显示最近的一个历史综述
      if (outlinesData.length > 0) {
        const sorted = [...outlinesData].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        loadOutlineDetail(sorted[0].id)
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, loadOutlineDetail])

  // 加载数据（修复依赖告警：loadData 作为依赖）
  useEffect(() => {
    loadData()
  }, [loadData])

  // 生成大纲
  const handleGenerate = async () => {
    if (selectedDocIds.length < 1 || isGenerating) return

    setIsGenerating(true)
    setCurrentOutline(null)
    setStreamingContent('')

    try {
      // 使用 SSE 流式获取
      const response = await fetch(`/api/research/projects/${projectId}/outlines/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedDocIds, focusTopic: focusTopic || undefined }),
      })

      if (!response.ok) {
        // 中文注释：402 积分不足时，后端返回 JSON（非 SSE），这里需要先解析再弹窗引导
        const errorData = await response.json().catch(() => ({ error: '生成大纲失败' }))
        if (response.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
          const err: any = new Error((errorData as any)?.error || '积分不足，无法生成文献综述')
          err.code = INSUFFICIENT_CREDITS_CODE
          throw err
        }
        throw new Error((errorData as any)?.error || '生成大纲失败')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const decoder = new TextDecoder()
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'error') {
                throw new Error(data.error)
              } else if (data.type === 'chunk') {
                // 实时累积流式内容
                setStreamingContent((prev) => prev + data.data)
              } else if (data.type === 'done') {
                setCurrentOutline(data.outline)
                setStreamingContent('')
              }
            } catch (e) {
              // 忽略解析错误，继续接收数据
            }
          }
        }
      }

      await loadData()
    } catch (err) {
      console.error('生成失败:', err)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((err as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (err as any)?.message || '积分不足，无法生成文献综述。请购买会员或充值积分后继续使用。',
        })
      } else {
        alert(err instanceof Error ? err.message : '生成失败')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // 删除大纲
  const handleDelete = async (outlineId: string) => {
    if (!confirm('确定要删除这个大纲吗？')) return

    try {
      await deleteOutlineApi(projectId, outlineId)
      if (currentOutline?.id === outlineId) {
        setCurrentOutline(null)
      }
      await loadData()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  // 保存编辑内容
  const handleSaveContent = async () => {
    if (!currentOutline || !editContent.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/research/projects/${projectId}/outlines/${currentOutline.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentOutline({ ...currentOutline, content: updated.content, updatedAt: updated.updatedAt })
        // 刷新列表
        await loadData()
      } else {
        alert('保存失败')
      }
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 复制内容
  const handleCopy = () => {
    if (!currentOutline) return
    navigator.clipboard.writeText(currentOutline.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 下载内容
  const handleDownload = () => {
    if (!currentOutline) return
    const blob = new Blob([currentOutline.content], { type: 'text/markdown;charset=utf-8' })
    saveAs(blob, `${currentOutline.title || '文献综述'}.md`)
  }

  // 解析 sourceDocs
  const getSourceDocNames = (sourceDocs: string | SourceDoc[]): string => {
    if (Array.isArray(sourceDocs)) {
      return sourceDocs.map((d) => d.fileName).join('、')
    }
    try {
      const parsed = JSON.parse(sourceDocs) as SourceDoc[]
      return parsed.map((d) => d.fileName).join('、')
    } catch {
      return ''
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileStack className="text-teal-600" size={28} />
          文献综述
        </h1>
        {/* 副标题：强调 AI 辅助梳理与框架产出，避免「一键成文」误解 */}
        <p className="text-slate-500 mt-1">
        选择多篇文献，梳理研究脉络，搭建综述框架
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：文档选择和历史大纲 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 文档选择 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-800">选择文献</h2>
              {documents.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedDocIds.length === documents.length) {
                      // 当前已全选，取消全选
                      setSelectedDocIds([])
                    } else {
                      // 当前未全选，全选
                      setSelectedDocIds(documents.map((doc) => doc.id))
                    }
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
                >
                  {selectedDocIds.length === documents.length ? '取消全选' : '全选'}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loading type="inline" text="加载文献中..." isLoading={true} />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-slate-400">暂无文献，请先在「文献速读」中添加或上传</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedDocIds.includes(doc.id)
                        ? 'border-teal-600 bg-teal-600/5 shadow-md'
                        : 'border-slate-200/40 bg-white hover:border-teal-400/60'
                    }`}
                    onClick={() => {
                      if (selectedDocIds.includes(doc.id)) {
                        setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id))
                      } else {
                        setSelectedDocIds([...selectedDocIds, doc.id])
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            doc.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
                          }`}
                        >
                          <FileText
                            size={18}
                            className={`flex-shrink-0 ${doc.fileType === 'pdf' ? 'text-red-600' : 'text-blue-600'}`}
                          />
                        </div>
                        <span className="text-sm text-slate-800 truncate max-w-[150px]">{doc.fileName}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          selectedDocIds.includes(doc.id)
                            ? 'bg-teal-600 text-white'
                            : 'border-2 border-slate-300 bg-white'
                        }`}
                      >
                        {selectedDocIds.includes(doc.id) && (
                          <CheckCircle size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 生成选项 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-4 shadow-sm">
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-800 mb-1">
                聚焦主题（可选）
              </label>
              <Input
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                placeholder="输入您关注的课题主题..."
                className="bg-white border-slate-200 rounded-xl"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={selectedDocIds.length < 1 || isGenerating}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isGenerating ? (
                <Loading type="button" text="正在梳理框架..." isLoading={true} />
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  梳理文献综述框架
                </>
              )}
            </Button>
            {selectedDocIds.length < 1 && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                请至少选择 1 篇文献后开始
              </p>
            )}
          </div>

          {/* 历史大纲列表 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">历史综述</h2>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loading type="inline" text="加载中..." isLoading={true} />
                </div>
              ) : outlines.length === 0 ? (
                <p className="text-sm text-slate-400">暂无生成记录</p>
              ) : (
                outlines.map((outline) => (
                  <div
                    key={outline.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentOutline?.id === outline.id
                        ? 'border-teal-600 bg-teal-600/5'
                        : 'border-slate-200/40 hover:border-teal-400/60'
                    }`}
                    onClick={() => loadOutlineDetail(outline.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 text-sm truncate">
                          {outline.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(outline.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(outline.id)
                        }}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {outline.status === 'published' && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <CheckCircle size={12} />
                        <span>已保存</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：综述展示 */}
        <div className="lg:col-span-2">
          {!currentOutline && !streamingContent ? (
            <div className="text-center py-12 text-slate-400">
              <FileStack size={48} className="mx-auto mb-4 opacity-50" />
              <p>请选择文献后梳理综述框架，结果将显示在此处</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Markdown 内容渲染 */}
              <div className="bg-white border border-slate-200/40 rounded-xl p-6 shadow-sm">
                <MarkdownEditor
                  value={isGenerating ? streamingContent : editContent}
                  onChange={setEditContent}
                  isGenerating={isGenerating}
                  minHeight="300px"
                />
                {!isGenerating && currentOutline && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleSaveContent}
                      disabled={isSaving || editContent === currentOutline.content}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loading type="inline" text="保存中..." isLoading={true} />
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} className="mr-2" />
                          保存修改
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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