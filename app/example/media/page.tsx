'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  type: 'text' | 'image' | 'image_generation' | 'loading'
  content?: string
  imageUrl?: string
  prompt?: string
  progress?: number
  timestamp: Date
}

const sampleGeneratedImages = [
  'https://images.unsplash.com/photo-1682687982501-1e58ab81476b?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1695048133083-7e98071e8021?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1682687982501-1e58ab81476b?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1695048133083-7e98071e8021?w=600&h=600&fit=crop'
]

export default function MediaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      type: 'text',
      content: '你好！我是Soulmates素材生成助手 🎨\n上传图片和提示词，我来为你生成精美的自媒体素材！',
      timestamp: new Date()
    }
  ])
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [promptText, setPromptText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const file = files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setSelectedImages(prev => [...prev, result])
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const simulateGeneration = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)

    const progressMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      type: 'loading',
      content: '正在生成素材...',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, progressMessage])

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300))
      setGenerationProgress(i)
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    setMessages(prev => prev.filter(m => m.id !== progressMessage.id))

    const imageMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      type: 'image_generation',
      content: '素材已生成完成！🎉',
      prompt: promptText,
      imageUrl: sampleGeneratedImages[Math.floor(Math.random() * sampleGeneratedImages.length)],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, imageMessage])
    setIsGenerating(false)
    setSelectedImages([])
    setPromptText('')
    setGenerationProgress(0)
  }

  const handleGenerate = async () => {
    if (selectedImages.length === 0 && !promptText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: selectedImages.length > 0 ? 'image' : 'text',
      content: promptText || '请生成素材',
      imageUrl: selectedImages[0],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    await simulateGeneration()
  }

  const regenerateImage = async () => {
    await simulateGeneration()
  }

  return (
    <div className="h-screen w-screen bg-[#f5f5f7] flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">Soulmates</h1>
          <p className="text-xs text-gray-500">素材生成助手</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overflow-x-hidden pt-[60px] pb-[280px]">
        {messages.map((message) => (
          <div key={message.id} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-white text-sm">🎨</span>
              </div>
            )}
            <div className={`max-w-[85%] ${
              message.role === 'user'
                ? 'bg-[#95ec69] text-gray-900 rounded-tl-2xl rounded-tr-lg rounded-bl-2xl'
                : 'bg-white text-gray-900 rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100'
            }`}>
              
              {message.type === 'loading' && (
                <div className="p-4">
                  <div className="flex flex-col items-center">
                    <div className="mb-3">
                      <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{message.content}</p>
                    <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{generationProgress}%</p>
                  </div>
                </div>
              )}

              {message.type === 'image' && message.imageUrl && (
                <div className={`${message.role === 'user' ? 'px-3 py-3' : 'p-4'}`}>
                  <div className="rounded-xl overflow-hidden">
                    <img src={message.imageUrl} alt="上传的图片" className="w-full h-auto" />
                  </div>
                  {message.content && (
                    <p className="text-sm leading-relaxed mt-3 whitespace-pre-line">{message.content}</p>
                  )}
                </div>
              )}

              {message.type === 'image_generation' && (
                <div className={`${message.role === 'user' ? 'px-3 py-3' : 'p-4'}`}>
                  {message.content && (
                    <p className="text-sm leading-relaxed mb-3 whitespace-pre-line">{message.content}</p>
                  )}
                  {message.prompt && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">提示词</p>
                      <p className="text-sm text-gray-800">{message.prompt}</p>
                    </div>
                  )}
                  {message.imageUrl && (
                    <div className="rounded-xl overflow-hidden mb-3">
                      <img src={message.imageUrl} alt="生成的图片" className="w-full h-auto" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={regenerateImage}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      重新生成
                    </button>
                    <button className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      下载
                    </button>
                  </div>
                </div>
              )}

              {message.type === 'text' && message.content && (
                <div className={`text-sm leading-relaxed whitespace-pre-line ${message.role === 'user' ? 'px-4 py-3' : 'p-4'}`}>
                  {message.content}
                </div>
              )}

              <div className={`text-xs ${message.role === 'user' ? 'text-right px-3 pb-2 text-gray-500' : 'text-left px-4 pb-3 text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 fixed bottom-0 left-0 right-0 z-50">
        {selectedImages.length > 0 && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {selectedImages.map((img, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt="预览" className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm hover:bg-gray-700 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 hide-scrollbar">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-full text-sm font-medium flex-shrink-0">
            小红书风格
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors flex-shrink-0">
            朋友圈封面
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors flex-shrink-0">
            产品展示
          </button>
        </div>

        <div className="flex items-end gap-2 w-full">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

          <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-3 flex items-center min-w-0">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="描述你想生成的素材..."
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400 w-full"
              disabled={isGenerating}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!promptText.trim() && selectedImages.length === 0)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isGenerating || (!promptText.trim() && selectedImages.length === 0)
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer'
            }`}
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
