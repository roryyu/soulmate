'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  type?: 'text' | 'music'
  content?: string
  musicData?: {
    title: string
    description: string
    duration: string
  }
  timestamp: Date
}

export default function MusicPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      type: 'text',
      content: '你好呀！✨ 我是 Soulmates 音乐疗愈师。现在心情怎么样？有什么想法或困惑吗？可以告诉我，我来为你挑选最适合的音乐~',
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
      '最近工作压力好大，有点焦虑',
      '心情很低落，什么都不想做',
      '今天特别烦躁，静不下来',
      '感觉很累，想放松一下',
      '失眠了，很难入睡'
    ]
    return texts[Math.floor(Math.random() * texts.length)]
  }

  const handleVoiceInput = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    await simulateMusicResponse(text)
  }

  const simulateMusicResponse = async (userText: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))

    let musicData: { title: string; description: string; duration: string }
    let healingText: string

    if (userText.includes('压力') || userText.includes('焦虑')) {
      musicData = {
        title: '冥想放松曲',
        description: '柔和的古筝与自然水声，帮助释放紧张情绪',
        duration: '05:32'
      }
      healingText = `我感受到了你的压力～ 🫂

这首「冥想放松曲」特别适合你。古筝的清雅音色搭配潺潺流水声，能让紧绷的神经慢慢放松下来。

试着闭上眼睛，深呼吸，让音乐带着你的思绪飘远～ 🌿

如果感觉好一点了，随时可以再来找我！`
    } else if (userText.includes('低落') || userText.includes('难过')) {
      musicData = {
        title: '温暖阳光',
        description: '轻快的钢琴旋律，如阳光般温暖心灵',
        duration: '04:18'
      }
      healingText = `看到你心情低落，有点心疼呢 💛

这首「温暖阳光」送给你～ 轻快的钢琴声像清晨的阳光，希望能给你带来一点温暖和力量。

记住，每一个情绪都值得被看见，你已经很棒了！🌈`
    } else if (userText.includes('烦躁') || userText.includes('静不下')) {
      musicData = {
        title: '静心古琴',
        description: '悠远的古琴声，让人内心平静',
        duration: '06:45'
      }
      healingText = `烦躁的时候，最需要让心先静下来 🪷

这首「静心古琴」有着悠远的意境，每一个音符都像是在轻轻安抚你的内心。

让思绪随着琴声慢下来，感受呼吸，你会慢慢平静的～ 🍃`
    } else if (userText.includes('累') || userText.includes('放松')) {
      musicData = {
        title: '森林之声',
        description: '大自然的声音与轻柔音乐的完美结合',
        duration: '08:12'
      }
      healingText = `累了就好好休息一下吧 🌲

听这首「森林之声」，仿佛置身于清晨的森林中。鸟鸣、风声、树叶沙沙响... 让身心都得到最自然的放松。

好好照顾自己，你值得这份宁静 💫`
    } else if (userText.includes('失眠') || userText.includes('睡')) {
      musicData = {
        title: '月光摇篮曲',
        description: '轻柔的旋律，伴你安然入睡',
        duration: '10:05'
      }
      healingText = `睡不着的时候，让我陪着你 🌙

这首「月光摇篮曲」温柔又治愈，像月光轻轻洒在身上。放下所有思绪，让音乐带你进入甜美的梦乡。

晚安，做个好梦～ 🌟`
    } else {
      musicData = {
        title: '心灵港湾',
        description: '温柔治愈的音乐，给心灵一个温暖的家',
        duration: '05:58'
      }
      healingText = `谢谢你告诉我你的心情 💝

这首「心灵港湾」希望能给你带来安慰。无论遇到什么，这里都愿意倾听你。

让音乐陪伴你，一切都会好起来的！✨`
    }

    const musicMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      type: 'music',
      musicData,
      content: healingText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, musicMessage])
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
          <p className="text-xs text-gray-500">音乐疗愈师</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-white text-sm">🎵</span>
              </div>
            )}
            <div
              className={`max-w-[78%] ${
                message.role === 'user'
                  ? 'bg-[#95ec69] text-gray-900 rounded-tl-2xl rounded-tr-lg rounded-bl-2xl'
                  : 'bg-white text-gray-900 rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100'
              }`}
            >
              {message.type === 'music' && message.musicData && (
                <div className={`border-b ${message.role === 'user' ? 'border-green-200 px-4 py-3' : 'border-gray-100 p-4'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-7 bg-white rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                        <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                        <div className="w-1 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{message.musicData.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{message.musicData.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">{message.musicData.duration}</span>
                        <button className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full hover:opacity-90 transition-opacity">
                          播放
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {message.content && (
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
              )}
              <div className={`text-xs ${message.role === 'user' ? 'text-right px-3 pb-2 text-gray-500' : 'text-left px-4 pb-3 text-gray-400'}`}>
                {formatMessageTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <span className="text-white text-sm">🎵</span>
            </div>
            <div className="bg-white rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">正在为你挑选音乐...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-3 overflow-x-auto pb-1">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <span className="text-lg">😌</span>
            放松心情
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <span className="text-lg">😴</span>
            改善睡眠
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0">
            <span className="text-lg">💪</span>
            提升活力
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
              placeholder="说说你的心情..."
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
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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
