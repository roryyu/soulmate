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
      content: '你好！我是 Soulmates 健康助手，专注于为你提供心理健康、睡眠管理和生活方式的专业建议。有什么可以帮助你的吗？',
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
      '最近睡眠质量不好，有什么改善方法？',
      '工作压力太大，感觉很焦虑怎么办？',
      '如何保持健康的生活作息？',
      '有什么缓解疲劳的好方法？',
      '想要改善心情，有什么建议吗？'
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

    let response = ''

    if (userText.includes('睡眠') || userText.includes('睡觉')) {
      response = `睡眠问题很常见，别担心！我给你几个建议：

1. 保持规律的作息时间，每天同一时间起床
2. 睡前1小时避免使用电子设备
3. 保持卧室安静、黑暗、温度适宜
4. 可以尝试冥想或深呼吸放松

我们的 Soulmates 睡眠疗愈产品能帮助你更好地改善睡眠质量，了解更多：https://soulmates.com/sleep 🌙`
    } else if (userText.includes('焦虑') || userText.includes('压力')) {
      response = `工作压力大是现代人常见的问题，试试这些方法：

1. 每天给自己留10分钟独处时间
2. 尝试正念呼吸练习
3. 适当运动释放压力
4. 与朋友家人倾诉

Soulmates 心理疗愈模块有专业的减压引导，了解更多：https://soulmates.com/anxiety 💆`
    } else if (userText.includes('作息') || userText.includes('生活')) {
      response = `保持健康的生活作息非常重要：

1. 早上7-8点起床，喝一杯温水
2. 中午小憩20-30分钟
3. 晚上11点前入睡
4. 三餐规律，营养均衡

Soulmates 健康管理计划能帮你建立良好习惯，了解更多：https://soulmates.com/habit 🏃`
    } else if (userText.includes('疲劳') || userText.includes('累')) {
      response = `缓解疲劳需要身心兼顾：

1. 保证7-8小时优质睡眠
2. 每隔1小时起身活动5分钟
3. 多吃富含维生素的食物
4. 尝试放松音乐或冥想

Soulmates 能量恢复产品能帮你快速恢复活力，了解更多：https://soulmates.com/energy ⚡`
    } else if (userText.includes('心情') || userText.includes('情绪')) {
      response = `改善心情有很多方法：

1. 每天记录三件感恩的事
2. 做自己喜欢的事，培养兴趣爱好
3. 多晒太阳，增加户外活动
4. 听喜欢的音乐，看治愈的电影

Soulmates 心情疗愈音乐库能帮你调节情绪，了解更多：https://soulmates.com/mood 🎵`
    } else {
      response = `感谢你的问题！关于"${userText}"，我建议你：

1. 保持积极心态，关注当下
2. 适度运动，保持活力
3. 与亲友保持良好沟通
4. 保证充足睡眠和营养

Soulmates 有专业的健康管理方案，了解更多：https://soulmates.com/ ✨`
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
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
    <div className="h-screen w-screen bg-[#f5f5f5] flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">Soulmates</h1>
          <p className="text-xs text-gray-500">AI 健康助手</p>
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-white text-sm">🤖</span>
              </div>
            )}
            <div
              className={`max-w-[78%] ${
                message.role === 'user'
                  ? 'bg-[#95ec69] text-gray-900 rounded-tl-2xl rounded-tr-lg rounded-bl-2xl'
                  : 'bg-white text-gray-900 rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100'
              }`}
            >
              <div className={`text-sm leading-relaxed whitespace-pre-line ${message.role === 'user' ? 'px-4 py-3' : 'p-4'}`}>
                {message.content.split(/(https:\/\/[^\s]+)/).map((part, index) => {
                  if (part.startsWith('https://')) {
                    return (
                      <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline ${message.role === 'user' ? 'text-blue-600' : 'text-pink-500'} hover:opacity-80`}
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                })}
              </div>
              <div className={`text-xs ${message.role === 'user' ? 'text-right px-3 pb-2 text-gray-500' : 'text-left px-4 pb-3 text-gray-400'}`}>
                {formatMessageTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <span className="text-white text-sm">🤖</span>
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

      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-3 overflow-x-auto pb-1">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            快速
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4M4 19h4M10 4l2 2M14 4l-2 2M4 10l2 2M14 10l-2 2M4 16l2 2M14 16l-2 2M12 14l2 2M12 20l2-2" />
            </svg>
            AI 创作
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            图片
          </button>
        </div>

        <div className="flex items-end gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-3 flex items-center">
            <input
              type="text"
              placeholder="发消息或按住说话..."
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400"
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
                  : 'bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/30'
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
    </div>
  )
}
