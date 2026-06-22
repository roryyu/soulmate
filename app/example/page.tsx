import Link from 'next/link'

export default function ExamplesPage() {
  const examples = [
    {
      id: 'chat',
      title: '手机端聊天界面',
      description: '长按语音输入，语音转文字，大模型回复',
      icon: '💬',
      path: '/example/chat'
    },
    {
      id: 'music',
      title: '音乐疗愈界面',
      description: '语音输入心情，返回定制音乐和疗愈文字',
      icon: '🎵',
      path: '/example/music'
    },
    {
      id: 'diary',
      title: '活动日记界面',
      description: '上传最多九张图片，生成温馨的活动日记',
      icon: '📔',
      path: '/example/diary'
    },
    {
      id: 'health',
      title: '健康档案界面',
      description: '全周期健康个人档案，步数、睡眠、运动数据展示',
      icon: '❤️',
      path: '/example/health'
    },
    {
      id: 'sales',
      title: '销售知识助手',
      description: '文档上传与目录管理，销售知识问答',
      icon: '💼',
      path: '/example/sales'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Soulmates 示例页面</h1>
          <p className="text-gray-600">探索我们精心设计的示例界面</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {examples.map((example) => (
            <Link
              key={example.id}
              href={example.path}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-pink-200"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {example.icon}
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{example.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{example.description}</p>
              <div className="mt-4 flex items-center text-pink-500 text-sm font-medium">
                <span>查看示例</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">更多示例即将推出...</p>
        </div>
      </div>
    </div>
  )
}
