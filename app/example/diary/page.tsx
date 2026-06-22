'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  type: 'text' | 'images' | 'diary'
  content?: string
  images?: string[]
  timestamp: Date
}

export default function DiaryPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      type: 'text',
      content: '你好呀！✨ 我是你的日记助手。上传今天的照片（最多九张），我会帮你生成一篇温馨的活动日记～',
      timestamp: new Date()
    }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showImagePreview, setShowImagePreview] = useState(false)
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
    const remainingSlots = 9 - selectedImages.length
    
    if (remainingSlots <= 0) {
      alert('最多只能上传九张图片哦')
      return
    }

    const filesToProcess = files.slice(0, remainingSlots)
    
    filesToProcess.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setSelectedImages(prev => [...prev, result])
      }
      reader.readAsDataURL(file)
    })

    setShowImagePreview(true)
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const clearImages = () => {
    setSelectedImages([])
    setShowImagePreview(false)
  }

  const sendImages = async () => {
    if (selectedImages.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'images',
      images: [...selectedImages],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setSelectedImages([])
    setShowImagePreview(false)
    setIsProcessing(true)

    await simulateDiaryGeneration(selectedImages)
  }

  const simulateDiaryGeneration = async (images: string[]) => {
    await new Promise(resolve => setTimeout(resolve, 2500 + Math.random() * 1500))

    const diaries = [
      {
        title: '🌸 春日的美好一天',
        content: `今天真是充实又开心的一天！早上阳光明媚，你去公园散步，拍下了美丽的花朵照片。中午和朋友一起享受美食，每个人都笑得很开心。下午在咖啡店看书，享受了一段宁静的时光。傍晚的日落景色格外美丽，真是完美的一天～

**今日小确幸**: 
✨ 看到了漂亮的花朵
✨ 和朋友相聚的快乐时光
✨ 享受了宁静的下午茶时光
✨ 看到了美丽的日落`
      },
      {
        title: '🏠 温馨的居家时光',
        content: `今天是悠闲的宅家日！你精心准备了一顿美味的早午餐，照片里的食物看起来太诱人啦！下午你还动手做了一些小手工，享受创作的乐趣。傍晚时分给自己泡了一杯热茶，看着窗外的风景，感到无比的平静和满足。

**今日小确幸**: 
✨ 享受烹饪的乐趣
✨ 动手创作带来的成就感
✨ 安静的下午茶时光
✨ 和家人相处的温馨时刻`
      },
      {
        title: '🚶‍♂️ 城市探索之旅',
        content: `今天你在城市里发现了很多有趣的地方！街角那家新开的咖啡店装修得很有格调，你拍了一张很有感觉的照片。路过公园时看到了可爱的小动物，还拍了城市的天际线。晚上的街道灯光璀璨，城市的夜景真美！

**今日小确幸**: 
✨ 发现新的咖啡店
✨ 看到可爱的小动物
✨ 城市的美丽夜景
✨ 探索未知的角落带来的惊喜`
      },
      {
        title: '🎨 充满艺术气息的一天',
        content: `今天你去了美术馆，欣赏了很多精彩的艺术作品！你拍了一些很有创意的照片，每一张都很有感觉。午餐时你尝试了新的餐厅，美食和氛围都很棒。回家路上看到了美丽的天空，真是充满灵感的一天！

**今日小确幸**: 
✨ 艺术作品带来的感动
✨ 尝试新餐厅的惊喜
✨ 天空的美丽景色
✨ 灵感迸发的美好时刻`
      }
    ]

    const randomDiary = diaries[Math.floor(Math.random() * diaries.length)]

    const diaryMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      type: 'diary',
      content: randomDiary.content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, diaryMessage])
    setIsProcessing(false)
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
          <p className="text-xs text-gray-500">日记助手</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overflow-x-hidden pt-[60px] pb-[200px]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-white text-sm">📔</span>
              </div>
            )}
            <div
              className={`max-w-[78%] ${
                message.role === 'user'
                  ? 'bg-[#95ec69] text-gray-900 rounded-tl-2xl rounded-tr-lg rounded-bl-2xl'
                  : 'bg-white text-gray-900 rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100'
              }`}
            >
              {message.type === 'images' && message.images && (
                <div className={`${message.role === 'user' ? 'px-3 py-3' : 'p-4'}`}>
                  <div className="grid grid-cols-3 gap-1.5">
                    {message.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {message.type === 'diary' && (
                <div className={`${message.role === 'user' ? 'px-3 py-3' : 'p-4'}`}>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📅</span>
                      <span className="text-sm font-medium text-amber-800">
                        {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {message.content}
                    </div>
                    <div className="mt-4 pt-3 border-t border-amber-200 flex justify-end gap-2">
                      <button className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-400 text-white text-xs rounded-full hover:opacity-90 transition-opacity flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        收藏
                      </button>
                      <button className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-400 text-white text-xs rounded-full hover:opacity-90 transition-opacity flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        分享
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {message.content && message.type === 'text' && (
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
              <span className="text-white text-sm">📔</span>
            </div>
            <div className="bg-white rounded-tl-lg rounded-tr-2xl rounded-br-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex gap-1 mb-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-xs text-gray-500">正在分析图片，生成日记...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 fixed bottom-0 left-0 right-0 z-50">
        {showImagePreview && selectedImages.length > 0 && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">已选择 {selectedImages.length}/9 张图片</span>
              <button onClick={clearImages} className="text-sm text-pink-500 hover:text-pink-600">
                清除
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700 transition-colors">
                    ×
                  </button>
                </div>
              ))}
              {selectedImages.length < 9 && (
                <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-pink-400 hover:text-pink-500 transition-colors flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
            <button onClick={sendImages} disabled={isProcessing} className="w-full mt-3 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              生成日记
            </button>
          </div>
        )}

        <div className="flex items-end gap-3 w-full">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-3 flex items-center min-w-0">
            <input
              type="text"
              placeholder="点击上方图标选择照片..."
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400 w-full"
              disabled={isProcessing}
            />
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
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
