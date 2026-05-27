'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sparkles, FileText, Wand2, Lightbulb, RefreshCw, Check, X, Loader2, Download } from 'lucide-react'
import { saveAs } from 'file-saver'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'

// 类型定义
interface Paper {
  id: string | null
  projectId: string
  title: string
  content: string
  createdAt: string | null
  updatedAt: string | null
}

interface Suggestion {
  type: string
  location: string
  original: string
  suggestion: string
  reason: string
}

export default function PolishingPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()

  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [removeAIFeatures, setRemoveAIFeatures] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [polishResult, setPolishResult] = useState('')
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [showFloatingMenu, setShowFloatingMenu] = useState(false)
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; description?: string }>({
    open: false,
  })

  const editorRef = useRef<HTMLTextAreaElement>(null)

  // 加载论文内容
  useEffect(() => {
    const loadPaper = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/research/projects/${projectId}/papers`)
        if (response.ok) {
          const data = await response.json()
          if (data.content) {
            setContent(data.content)
            setTitle(data.title || '')
          }
        }
      } catch (error) {
        console.error('加载论文失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPaper()
  }, [projectId])

  // 保存论文
  const savePaper = useCallback(async () => {
    setSaving(true)
    try {
      await fetch(`/api/research/projects/${projectId}/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setSaving(false)
    }
  }, [projectId, title, content])

  // 下载 Word 文档
  const handleDownloadDocx = useCallback(async () => {
    if (!content.trim()) {
      alert('没有内容可下载')
      return
    }

    try {
      // 动态导入 docx 库
      const docx = await import('docx')
      const { Packer, Paragraph, TextRun, HeadingLevel } = docx

      // 将文本按段落分割
      const paragraphs = content.split('\n').filter(p => p.trim())

      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            // 标题
            new Paragraph({
              text: title || '论文文档',
              heading: HeadingLevel.TITLE,
              spacing: { after: 400 },
            }),
            // 正文段落
            ...paragraphs.map(p =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: p,
                    font: '宋体',
                    size: 24, // 24 = 12pt
                  }),
                ],
                spacing: { after: 200 },
              })
            ),
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      const fileName = title ? `${title}.docx` : '论文文档.docx'
      saveAs(blob, fileName)
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请重试')
    }
  }, [content, title])

  // 自动保存
  useEffect(() => {
    if (!content) return
    const timer = setTimeout(() => {
      savePaper()
    }, 2000)
    return () => clearTimeout(timer)
  }, [content, savePaper])



  // 选中文本处理
  const handleTextSelect = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim() || ''
    setSelectedText(text)
    setShowFloatingMenu(!!text)
  }

  // 隐藏悬浮菜单
  const hideFloatingMenu = () => {
    setShowFloatingMenu(false)
  }

  // 处理润色操作 - SSE流式版本
  const handlePolish = async (action: string) => {
    if (!content.trim()) {
      alert('请先输入论文内容')
      return
    }

    if ((action === 'polish' || action === 'expand' || action === 'rewrite') && !selectedText) {
      alert('请先选中要处理的文字')
      return
    }

    setLoading(true)
    setCurrentAction(action)
    setPolishResult('')

    try {
      const response = await fetch(`/api/research/projects/${projectId}/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          selectedText,
          action,
          removeAIFeatures,
        }),
      })

      if (!response.ok) {
        // 中文注释：402 积分不足时，后端返回 JSON（非 SSE），这里需要先解析再弹窗引导
        const errorData = await response.json().catch(() => ({ error: '处理失败' }))
        if (response.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
          const err: any = new Error((errorData as any)?.error || '积分不足，无法完成本次润色操作')
          err.code = INSUFFICIENT_CREDITS_CODE
          throw err
        }
        throw new Error((errorData as any)?.error || '处理失败')
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
                setPolishResult(fullResponse)
              } else if (parsed.type === 'done') {
                fullResponse = parsed.result || fullResponse
                setPolishResult(fullResponse)
              } else if (parsed.type === 'error') {
                console.error('处理错误:', parsed.error)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('处理失败:', error)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((error as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (error as any)?.message || '积分不足，无法完成本次操作。请购买会员或充值积分后继续使用。',
        })
      } else {
        alert('处理失败，请重试')
      }
    } finally {
      setLoading(false)
      setCurrentAction(null)
    }
  }

  // 接受修改
  const applySuggestion = (suggestion: Suggestion) => {
    const newContent = content.replace(suggestion.original, suggestion.suggestion)
    setContent(newContent)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <input
            type="text"
            placeholder="研究的标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium bg-transparent border-none outline-none text-slate-800 placeholder-[slate-400] w-full"
          />
          {saving && (
            <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <Loader2 size={12} className="animate-spin" />
              保存中...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 表述优化：弱化模板化表达，使行文更自然（对应后端 removeAIFeatures） */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={removeAIFeatures}
                onChange={(e) => setRemoveAIFeatures(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-10 h-5 rounded-full transition-colors ${
                  removeAIFeatures ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  removeAIFeatures ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm text-slate-500">表述优化</span>
          </label>

          {/* 下载 Word 按钮 */}
          <button
            onClick={handleDownloadDocx}
            disabled={!content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span>下载 Word</span>
          </button>


        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧编辑器 */}
        <div className="flex-1 flex flex-col bg-white">
          {/* 编辑器工具提示 */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-400">
            选中文字可进行学术润色、观点扩充、智能降重 | 支持粘贴论文正文
          </div>

          {/* 编辑区域 */}
          <div className="flex-1 relative overflow-hidden">
            {/* 悬浮工具栏 - 固定在编辑器顶部 */}
            {showFloatingMenu && selectedText && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 whitespace-nowrap">
                <button
                  onClick={() => { handlePolish('polish'); hideFloatingMenu(); }}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  学术润色
                </button>
                <button
                  onClick={() => { handlePolish('expand'); hideFloatingMenu(); }}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  观点扩充
                </button>
                <button
                  onClick={() => { handlePolish('rewrite'); hideFloatingMenu(); }}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  智能降重
                </button>

                {/* 关闭按钮 */}
                <button
                  onClick={hideFloatingMenu}
                  className="ml-1 p-1 text-white/60 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onMouseUp={handleTextSelect}
              onKeyUp={handleTextSelect}
              placeholder="在此粘贴或输入论文正文，选中文字后点击上方按钮进行润色..."
              className="w-full h-full p-6 resize-none outline-none text-slate-800 text-base leading-relaxed font-serif bg-transparent"
              style={{ border: 'none', minHeight: '500px' }}
            />
          </div>
        </div>

        {/* 右侧：科研润色助手 */}
        <div className="w-96 border-l border-slate-200 bg-slate-50 overflow-auto">
          <div className="p-4">
            <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={16} />
              科研润色助手
            </h3>

            {/* 处理中的状态 */}
            {loading && currentAction && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-slate-400">
                  {currentAction === 'polish' && '正在润色...'}
                  {currentAction === 'expand' && '正在扩充...'}
                  {currentAction === 'rewrite' && '正在降重...'}
                </span>
              </div>
            )}

            {/* 润色结果展示 - 支持流式显示 */}
            {polishResult && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                <h4 className="text-xs font-medium text-teal-600 mb-2">
                  {loading ? '正在处理...' : '处理结果'}
                </h4>
                <MarkdownEditor
                  value={polishResult}
                  disabled
                  isGenerating={loading}
                  minHeight="150px"
                />
                {!loading && selectedText && (
                  <button
                    onClick={() => {
                      const newContent = content.replace(selectedText, polishResult)
                      setContent(newContent)
                    }}
                    className="w-full py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                  >
                    覆盖原文
                  </button>
                )}
              </div>
            )}

            {/* 加载中状态 */}
            {loading && currentAction && !polishResult && (
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-teal-600" />
                  <span className="text-sm text-slate-800">正在处理...</span>
                </div>
              </div>
            )}

            {/* 空状态：使用说明 */}
            {!loading && !polishResult && (
              <div className="py-8 px-1 text-slate-600">
                <Sparkles size={32} className="mx-auto mb-4 text-teal-600/35" />
                <p className="text-sm font-medium text-slate-800 mb-3">使用方式：</p>
                <ol className="text-sm space-y-2.5 leading-relaxed list-decimal pl-4 marker:text-slate-400">
                  <li>在编辑区选中需要优化的文字（字词、句子或段落均可）</li>
                  <li>点击下方优化方式，选择您需要的处理类型</li>
                  <li>系统将生成优化结果，您可直接采纳或继续编辑</li>
                </ol>
                <p className="text-xs text-slate-400 text-center mt-6">选择操作开始润色</p>
              </div>
            )}
          </div>
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
