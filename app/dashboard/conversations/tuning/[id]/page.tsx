'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// 支持的模型列表
const AVAILABLE_MODELS = [
  { id: 'deepseek-v3-2-251201', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'glm-4-7-251222', name: 'GLM-4', provider: '智谱AI' },
]

type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type AIConversation = {
  id: string
  userId: string | null
  userName: string | null
  module: string
  model: string
  prompt: string
  response: string | null
  tokens: number | null
  duration: number | null
  error: string | null
  metadata: string | null
  createdAt: Date
}

type ModelResult = {
  modelId: string
  modelName: string
  response: string
  duration: number
  tokens: number | null
  error: string | null
  isComplete: boolean
}

// 执行流式调用并返回最终结果
const executeStreamModel = (
  modelId: string,
  messages: Message[],
  onChunk: (modelId: string, chunk: string) => void
): Promise<ModelResult> => {
  return new Promise(async (resolve) => {
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId) || { name: modelId, provider: '' }
    let fullResponse = ''
    const startTime = Date.now()

    try {
      const res = await fetch('/api/ai/tuning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: modelId,
          stream: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        resolve({
          modelId,
          modelName: modelInfo.name,
          response: '',
          duration: 0,
          tokens: null,
          error: data.error || '调用失败',
          isComplete: true,
        })
        return
      }

      if (!res.body) {
        resolve({
          modelId,
          modelName: modelInfo.name,
          response: '',
          duration: 0,
          tokens: null,
          error: '响应体为空',
          isComplete: true,
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk') {
                fullResponse += data.data
                onChunk(modelId, data.data)
              } else if (data.type === 'done') {
                fullResponse = data.response
              }
            } catch {
              // 解析失败，跳过
            }
          }
        }
      }

      resolve({
        modelId,
        modelName: modelInfo.name,
        response: fullResponse,
        duration: Date.now() - startTime,
        tokens: null,
        error: null,
        isComplete: true,
      })
    } catch (error) {
      resolve({
        modelId,
        modelName: modelInfo.name,
        response: fullResponse,
        duration: Date.now() - startTime,
        tokens: null,
        error: error instanceof Error ? error.message : '调用失败',
        isComplete: true,
      })
    }
  })
}

export default function TuningPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { status } = useSession()
  const router = useRouter()

  const [conversation, setConversation] = useState<AIConversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 可编辑的对话消息
  const [messages, setMessages] = useState<Message[]>([])

  // 原始结果（用于对比）
  const [originalResult, setOriginalResult] = useState<{
    response: string
    duration: number
    tokens: number | null
  } | null>(null)

  // 选中的模型（多选）
  const [selectedModels, setSelectedModels] = useState<string[]>([AVAILABLE_MODELS[0].id])

  // 批量执行结果（每个模型独立状态）
  const [results, setResults] = useState<Record<string, ModelResult>>({})

  // 是否正在执行
  const [isExecuting, setIsExecuting] = useState(false)

  // 拉取对话：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const fetchConversation = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      if (!res.ok) throw new Error('获取对话记录失败')
      const data = await res.json()
      setConversation(data)

      let parsedMessages: Message[] = []
      if (data.metadata) {
        try {
          const meta = JSON.parse(data.metadata)
          if (meta.messages) {
            parsedMessages = meta.messages
          }
        } catch {
          // 解析失败，使用默认构造
        }
      }

      if (parsedMessages.length === 0) {
        parsedMessages = [
          { role: 'user', content: data.prompt }
        ]
      }

      setMessages(parsedMessages)

      setOriginalResult({
        response: data.response || '',
        duration: data.duration || 0,
        tokens: data.tokens,
      })
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConversation()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, fetchConversation, router])

  // 并行执行多个模型的流式调用
  const executeBatch = async () => {
    if (selectedModels.length === 0) {
      alert('请至少选择一个模型')
      return
    }

    setIsExecuting(true)

    // 初始化每个模型的结果状态
    const initialResults: Record<string, ModelResult> = {}
    selectedModels.forEach(modelId => {
      const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId) || { name: modelId, provider: '' }
      initialResults[modelId] = {
        modelId,
        modelName: modelInfo.name,
        response: '',
        duration: 0,
        tokens: null,
        error: null,
        isComplete: false,
      }
    })
    setResults(initialResults)

    // 并行执行所有模型
    const promises = selectedModels.map(async (modelId) => {
      const result = await executeStreamModel(
        modelId,
        messages,
        (mid, chunk) => {
          // 流式更新响应
          setResults(prev => ({
            ...prev,
            [mid]: {
              ...prev[mid],
              response: (prev[mid]?.response || '') + chunk,
            }
          }))
        }
      )
      return result
    })

    // 等待所有模型完成
    const finalResults = await Promise.all(promises)

    // 更新最终结果
    const finalResultsMap: Record<string, ModelResult> = {}
    finalResults.forEach(result => {
      finalResultsMap[result.modelId] = result
    })
    setResults(finalResultsMap)
    setIsExecuting(false)
  }

  // 切换模型选中状态
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  // 全选/取消全选
  const toggleAllModels = () => {
    if (selectedModels.length === AVAILABLE_MODELS.length) {
      setSelectedModels([])
    } else {
      setSelectedModels(AVAILABLE_MODELS.map(m => m.id))
    }
  }

  const updateMessage = (index: number, field: 'role' | 'content', value: string) => {
    const newMessages = [...messages]
    newMessages[index] = { ...newMessages[index], [field]: value }
    setMessages(newMessages)
  }

  // 获取模型对应的颜色
  const getModelColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500']
    return colors[index % colors.length]
  }

  // 获取模型执行状态
  const getModelStatus = (modelId: string) => {
    const result = results[modelId]
    if (!result) return 'pending'
    if (result.isComplete) return 'complete'
    return 'streaming'
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-teal-600 transition-colors">平台首页</Link>
          <span className="mx-2">/</span>
          <Link href="/dashboard" className="hover:text-teal-600 transition-colors">Dashboard</Link>
          <span className="mx-2">/</span>
          <Link href="/dashboard/conversations" className="hover:text-teal-600 transition-colors">AI 对话记录</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800 font-medium">Prompt 调优</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Prompt 调优</h1>
            <p className="mt-1 text-slate-500">
              模块: {conversation?.module} | 原始耗时: {originalResult?.duration}ms
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-slate-200 text-slate-800 hover:bg-slate-50"
            >
              返回
            </Button>
            <Button
              onClick={executeBatch}
              disabled={isExecuting || selectedModels.length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isExecuting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  并行执行中...
                </>
              ) : (
                <>
                  <span className="mr-2">▶</span>
                  并行执行 ({selectedModels.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 模型选择 */}
        <div className="bg-white rounded-xl border border-slate-200/40 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-800">选择模型:</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModels.length === AVAILABLE_MODELS.length}
                    onChange={toggleAllModels}
                    className="w-4 h-4 text-teal-600 rounded border-slate-200 focus:ring-teal-600"
                  />
                  <span className="text-sm text-slate-500">全选</span>
                </label>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-3">
                {AVAILABLE_MODELS.map((model) => {
                  const status = getModelStatus(model.id)
                  return (
                    <label
                      key={model.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        selectedModels.includes(model.id)
                          ? 'bg-teal-600/10 border border-teal-600'
                          : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(model.id)}
                        onChange={() => toggleModel(model.id)}
                        disabled={isExecuting}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-600"
                      />
                      <span className="text-sm text-slate-800">{model.name}</span>
                      <span className="text-xs text-slate-500">({model.provider})</span>
                      {status === 'streaming' && (
                        <span className="animate-pulse text-teal-600">◐</span>
                      )}
                      {status === 'complete' && (
                        <span className="text-green-500">✓</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：对话消息 */}
          <div className="bg-white rounded-xl border border-slate-200/40 shadow-sm p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">对话消息</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className="border border-slate-200/40 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      msg.role === 'system' ? 'bg-purple-100 text-purple-700' :
                      msg.role === 'user' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {msg.role === 'system' ? 'System' : msg.role === 'user' ? 'User' : 'Assistant'}
                    </span>
                  </div>
                  <Textarea
                    value={msg.content}
                    onChange={(e) => updateMessage(index, 'content', e.target.value)}
                    placeholder="消息内容..."
                    className="min-h-[5000px] border-slate-200 rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：结果展示 */}
          <div className="space-y-6">
            {/* 原始结果 */}
            {originalResult && (
              <div className="bg-white rounded-xl border border-slate-200/40 shadow-sm p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  原始结果
                  <span className="text-sm font-normal text-slate-500">
                    ({originalResult.duration}ms, {originalResult.tokens} tokens)
                  </span>
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-200">
                  {originalResult.response || '无响应'}
                </div>
              </div>
            )}

            {/* 并行执行结果 */}
            {Object.keys(results).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  并行执行结果
                </h3>
                {selectedModels.map((modelId, index) => {
                  const result = results[modelId]
                  if (!result) return null

                  const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId)

                  return (
                    <div
                      key={modelId}
                      className="bg-white rounded-xl border border-slate-200/40 shadow-sm p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800 flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${getModelColor(index)}`}></span>
                          {modelInfo?.name || modelId}
                          {!result.isComplete && (
                            <span className="animate-pulse text-teal-600 text-sm">◐ 流式输出中...</span>
                          )}
                          {result.isComplete && (
                            <span className="text-green-500 text-sm">✓</span>
                          )}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {result.error ? (
                            <span className="text-red-500">执行失败</span>
                          ) : result.isComplete ? (
                            <>耗时: {result.duration}ms</>
                          ) : (
                            <>输出中...</>
                          )}
                        </span>
                      </div>
                      {result.error ? (
                        <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap border border-red-200">
                          {result.error}
                        </div>
                      ) : (
                        <div className="bg-green-50 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto border border-green-200">
                          {result.response || (result.isComplete ? '无响应' : '等待响应...')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* 初始状态 */}
            {Object.keys(results).length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200/40 shadow-sm p-8 text-center">
                <div className="text-slate-500 mb-2">选择模型后点击"并行执行"</div>
                <div className="text-sm text-slate-400">多个模型将同时运行并流式输出结果</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
