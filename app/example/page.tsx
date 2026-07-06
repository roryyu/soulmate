import Link from 'next/link'
import Image from 'next/image'

export default function ExamplesPage() {
  const examples = [
    {
      id: 'chat',
      title: '手机端聊天界面',
      description: '长按语音输入，语音转文字，大模型回复',
      icon: '💬',
      path: '/example/chat',
      qrcode: '/qrcode_chat.png'
    },
    {
      id: 'music',
      title: '音乐疗愈界面',
      description: '语音输入心情，返回定制音乐和疗愈文字',
      icon: '🎵',
      path: '/example/music',
      qrcode: '/qrcode_music.png'
    },
    {
      id: 'diary',
      title: '活动日记界面',
      description: '上传最多九张图片，生成温馨的活动日记',
      icon: '📔',
      path: '/example/diary',
      qrcode: '/qrcode_diary.png'
    },
    {
      id: 'health',
      title: '健康档案界面',
      description: '全周期健康个人档案，步数、睡眠、运动数据展示',
      icon: '❤️',
      path: '/example/health',
      qrcode: '/qrcode_health.png'
    },
    {
      id: 'sales',
      title: '销售知识助手',
      description: '文档上传与目录管理，销售知识问答',
      icon: '💼',
      path: '/example/sales',
      qrcode: '/qrcode_sales.png'
    },
    {
      id: 'exam',
      title: '知识考试系统',
      description: '单选、多选、填空题，10题在线考试',
      icon: '📝',
      path: '/example/exam',
      qrcode: '/qrcode_exam.png'
    },
    {
      id: 'media',
      title: '自媒体素材生成',
      description: '上传图片和提示词，AI生成精美素材',
      icon: '🎨',
      path: '/example/media',
      qrcode: '/qrcode_media.png'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Soulmates</h1>
          <p className="text-gray-600">扫码即可在手机端体验</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {examples.map((example) => (
            <div
              key={example.id}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-pink-200"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                  {example.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">{example.title}</h2>
                  <p className="text-gray-600 text-xs leading-relaxed">{example.description}</p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0" style={{width:"100%"}}>
                  <Image
                    src={example.qrcode}
                    alt={`${example.title}二维码`}
                    width={128}
                    height={128}
                    className="w-full h-full object-contain"
                    style={{display:"block",margin:"0 auto"}}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">更多Service即将推出...</p>
        </div>
      </div>
    </div>
  )
}
