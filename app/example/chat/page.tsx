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
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {message.content.split(/(https:\/\/[^\s]+)/).map((part, index) => {
                    if (part.startsWith('https://')) {
                      return (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`underline ${message.role === 'user' ? 'text-pink-100' : 'text-pink-500'} hover:opacity-80`}
                        >
                          {part}
                        </a>
                      );
                    }
                    return part;
                  })}
                </div>
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
