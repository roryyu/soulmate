'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是 Soulmates 智能助手，有什么可以帮助你的吗？',
      timestamp: new Date()
    }
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startRecording = () => {
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

      let finalTranscript = ''
      let interimTranscript = ''

      recognitionRef.current.onresult = (event: any) => {
        interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
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
      '今天天气怎么样？',
      '帮我写一首关于春天的诗',
      '介绍一下人工智能的发展历史',
      '如何提高工作效率？',
      '推荐几本好看的书'
    ]
    return texts[Math.floor(Math.random() * texts.length)]
  }

  const handleVoiceInput = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    await simulateAIResponse(text)
  }

  const simulateAIResponse = async (userText: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500))

    const responses = [
      `这是一个很好的问题！关于"${userText}"，我来为你详细解答一下...`,
      `好的，我理解你的需求。让我想想怎么帮你解决"${userText}"这个问题...`,
      `非常有趣的话题！关于"${userText}"，我有一些想法想和你分享...`,
      `收到！我来帮你处理"${userText}"这个请求，请稍等片刻...`,
      `好问题！让我为你分析一下"${userText}"这个话题...`
    ]

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, aiMessage])
    setIsProcessing(false)
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '700px' }}>
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h1 className="font-semibold text-lg">Soulmates 助手</h1>
            <p className="text-sm text-pink-100">在线</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-pink-100' : 'text-gray-400'}`}>
                  {formatMessageTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
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

        <div className="bg-white p-4 border-t border-gray-100">
          <div className="flex justify-center">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 animate-ping">
                  <div className="w-full h-full rounded-full bg-pink-500/30" />
                </div>
              )}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isProcessing}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 scale-110 shadow-lg shadow-red-500/30'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/30'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                      <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                    </div>
                    <span className="text-white text-xs mt-1 font-medium">{formatTime(recordingTime)}</span>
                  </div>
                ) : (
                  <div className="text-white text-3xl">🎤</div>
                )}
              </button>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-3">
            {isProcessing ? '正在思考中...' : isRecording ? '松开停止录音' : '长按说话'}
          </p>
        </div>
      </div>
    </div>
  )
}
