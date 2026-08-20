'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  type?: 'text' | 'document'
  content?: string
  documentData?: {
    name: string
    directory: string
  }
  timestamp: Date
}

const directories = [
  { name: '全部文档', icon: '📁' },
  { name: '产品手册', icon: '📕' },
  { name: '销售技巧', icon: '📗' },
  { name: '客户案例', icon: '📘' },
  { name: '价格政策', icon: '📙' },
  { name: '常见问题', icon: '📓' }
]

const salesResponses = {
  产品: `关于产品销售技巧，我给你几点建议：

1. 充分了解产品的核心卖点和差异化优势
2. 用客户听得懂的语言解释技术术语
3. 准备生动的成功案例和数据支撑
4. 把产品功能转化为客户的实际收益

💡 提示：FABE法则（Feature特征、Advantage优势、Benefit利益、Evidence证据）`,
  
  客户: `处理客户异议的策略：

1. 倾听-理解-确认-回应，不要急于辩解
2. 把异议转化为机会，说明背后是客户的需求
3. 提供具体案例和数据作为证据
4. 确认客户的顾虑是否得到解决

💡 提示：客户说"价格太贵"时，不要直接降价，而是强调价值！`,

  成交: `促成成交的技巧：

1. 假设成交："那我们就确定这套方案了？"
2. 限时优惠："本季度促销最后三天"
3. 二选一："您选A套餐还是B套餐？"
4. 小点成交："我们先确认服务条款？"

💡 提示：80%的成交是在第5次跟进后达成的，坚持跟进！`,

  价格: `应对价格异议的方法：

1. 不要先报价，先充分展示价值
2. 把价格分解到月/天，显得更实惠
3. 对比法："贵30%但多用2年"
4. 增加附加价值而非直接降价
5. 反问法："您觉得什么价格合适？"

💡 提示：价格异议是好事，说明客户有购买意向！`
}

export default function SalesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      type: 'text',
      content: '你好！我是 Soulmates 销售知识助手，专注于销售技巧、客户沟通、产品推广等领域。你可以上传文档或直接提问！',
      timestamp: new Date()
    }
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDirectory, setShowDirectory] = useState(false)
  const [selectedDirectory, setSelectedDirectory] = useState('全部文档')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isStoppingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startRecording = () => {
    isStoppingRef.current = false
    setIsRecording(true)
    setRecordingTime(0)

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'zh-CN'

      recognitionRef.current.finalTranscript = ''
      let interimTranscript = ''

      recognitionRef.current.onresult = (event: any) => {
        interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            recognitionRef.current.finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        stopRecording()
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start()
        }
      }

      recognitionRef.current.start()
    } else {
      alert('您的浏览器不支持语音识别功能')
      stopRecording()
    }
  }

  const stopRecording = () => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true
    setIsRecording(false)
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      
      setTimeout(() => {
        if (recognitionRef.current.finalTranscript) {
          handleVoiceInput(recognitionRef.current.finalTranscript)
        } else {
          const mockText = getRandomMockText()
          handleVoiceInput(mockText)
        }
      }, 300)
    } else {
      const mockText = getRandomMockText()
      handleVoiceInput(mockText)
    }
  }

  const getRandomMockText = () => {
    const texts = [
      '怎么介绍产品？',
      '客户说太贵怎么办？',
      '如何促成成交？',
      '处理客户异议的技巧',
      '销售技巧分享'
    ]
    return texts[Math.floor(Math.random() * texts.length)]
  }

  const handleVoiceInput = async (text: string) => {
    if (!text.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    await simulateSalesResponse(text)
  }

  const simulateSalesResponse = async (userText: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500))

    let response = ''
    
    if (userText.includes('产品')) {
      response = salesResponses.产品
    } else if (userText.includes('客户') || userText.includes('异议')) {
      response = salesResponses.客户
    } else if (userText.includes('成交') || userText.includes('下单')) {
      response = salesResponses.成交
    } else if (userText.includes('价格') || userText.includes('贵') || userText.includes('便宜')) {
      response = salesResponses.价格
    } else {
      response = `感谢你的问题！关于销售，这里有几个通用建议：

1. 准备充分：了解客户背景和需求
2. 真诚沟通：建立信任关系是关键
3. 价值导向：关注客户利益而非产品
4. 坚持跟进：80%成交在第5次后

有具体问题随时问我！💼`
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      type: 'text',
      content: response,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, aiMessage])
    setIsProcessing(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const file = files[0]
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'document',
      content: `上传了文档：${file.name}`,
      documentData: {
        name: file.name,
        directory: selectedDirectory
      },
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setShowDirectory(false)

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: 'text',
        content: `文档"${file.name}"已成功上传到"${selectedDirectory}"目录！✅

已完成：
• 文档解析与内容提取
• 关键信息索引建立
• 智能分类标记完成

现在你可以基于这个文档提问了！`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsProcessing(false)
    }, 2000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-screen w-screen bg-[#f5f5f5] flex flex-col overflow-x-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 fixed top-0 left-0 right-0 z-50">
        <button className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">Soulmates</h1>
          <p className="text-xs text-gray-500">销售知识助手</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {showDirectory && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end" onClick={() => setShowDirectory(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择目录</h2>
            <div className="space-y-2">
              {directories.map((dir) => (
                <button
                  key={dir.name}
                  onClick={() => {
                    setSelectedDirectory(dir.name)
                    setShowDirectory(false)
                    fileInputRef.current?.click()
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedDirectory === dir.name ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl">{dir.icon}</span>
                  <span className="text-base text-gray-900">{dir.name}</span>
                  {selectedDirectory === dir.name && (
                    <svg className="w-5 h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overflow-x-hidden pt-[60px] pb-[200px]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-white text-sm">💼</span>
              </div>
            )}
            <div
              className={`max-w-[78%] ${
                message.role === 'user'
                  ? 'bg-[#95ec69] text-gray-900 rounded-tl-2xl rounded-tr-lg rounded-bl-2xl'
                  : 'bg-white text-gray-900 rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100'
              }`}
            >
              {message.type === 'document' && message.documentData && (
                <div className={`${message.role === 'user' ? 'px-4 py-3' : 'p-4'}`}>
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{message.documentData.name}</p>
                      <p className="text-xs text-gray-500">目录：{message.documentData.directory}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {message.content && (
                <div className={`text-sm leading-relaxed whitespace-pre-line ${message.role === 'user' ? 'px-4 py-3' : 'p-4'}`}>
                  {message.content}
                </div>
              )}
              
              <div className={`text-xs ${message.role === 'user' ? 'text-right px-3 pb-2 text-gray-500' : 'text-left px-4 pb-3 text-gray-400'}`}>
                {formatMessageTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <span className="text-white text-sm">💼</span>
            </div>
            <div className="bg-white rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3 mb-3 overflow-x-auto pb-1 hide-scrollbar">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            产品介绍
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            客户沟通
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            价格谈判
          </button>
        </div>

        <div className="flex items-end gap-3 w-full">
          <button onClick={() => setShowDirectory(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

          <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-3 flex items-center min-w-0">
            <input
              type="text"
              placeholder="输入销售问题或上传文档..."
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400 w-full"
              disabled={isProcessing || isRecording}
            />
          </div>

          <div className="relative flex-shrink-0">
            {isRecording && (
              <div className="absolute inset-0 animate-ping">
                <div className="w-full h-full rounded-full bg-red-500/30" />
              </div>
            )}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isProcessing}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isRecording
                  ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110 shadow-lg shadow-red-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-purple-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isRecording ? (
                <div className="flex flex-col items-center">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  </div>
                </div>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {isRecording && (
          <div className="mt-3 text-center">
            <p className="text-red-500 text-sm font-medium">正在录音 {formatTime(recordingTime)} · 松开结束</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
