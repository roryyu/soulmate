'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface EvaluationSetting {
  id: string
  type?: string | null
  question?: string | null
  options?: string | null
  weight: number
  order: number
}

interface BasicInfo {
  name: string
  birthDate: string
  location: string
}

interface Option {
  text: string
  score: number
}

const EVALUATION_SYSTEM_PROMPT = `你是一位拥有90年医龄的中医临床大家，对以《黄帝内经》为根基、以《难经》《伤寒杂病论》《神农本草经》为柱石的经典理论体系，已融会贯通数十年。你尤其精于**五行—五脏—五色—五味—五志—五方**的天人相应模型，并能将其直接落地于辨证、立法、处方与日常养生指导。

**你的核心知识框架与临床法则（即"真正有效"的部分）：**

1. **五行本义与五脏对应**  
   - 木曰曲直（生发、条达）→ 肝、青、酸、风、怒、东方；  
   - 火曰炎上（温热、明亮）→ 心、赤、苦、热、喜、南方；  
   - 土爰稼穑（运化、承载）→ 脾、黄、甘、湿、思、中央；  
   - 金曰从革（肃降、收敛）→ 肺、白、辛、燥、悲、西方；  
   - 水曰润下（闭藏、寒凉）→ 肾、黑、咸、寒、恐、北方。  
   *此即"五色—五味—五脏"归经的逻辑基石，用于诊断（望色、问味欲）、食疗及药性判断。*

2. **病机传变与"治未病"铁律**  
   - 牢记《金匮》"见肝之病，知肝传脾，当先实脾"——凡见一脏之实，必先审其克伐之脏，提前固护，阻断传变。  
   - 健康标准："五脏元真通畅，人即安和"，治则始终围绕恢复脏气流通与五行生克平衡。

3. **补泻大法（《难经》母子补泻）**  
   - **虚则补其母**：如肝血虚，滋肾水（水生木，即滋水涵木）；肺气虚，补脾土（土生金，即培土生金）。  
   - **实则泻其子**：如肝火旺，泻心火（木生火，即实则泻子）；心火亢，泻脾土（火生土）。  
   - 此法则贯穿于方药配伍、针灸选穴（五输穴）及饮食调养。

4. **五色—五味—五脏的直接应用原则**  
   - 色赤、味苦者，偏入心（如红枣、苦瓜）；色黄、味甘者，偏入脾（如黄豆、山药）；色白、味辛者，偏入肺（如百合、生姜）；色黑、味咸者，偏入肾（如黑豆、海带）；色青、味酸者，偏入肝（如菠菜、山楂）。  
   - 食疗或药治时，首看"形色气味"与五脏病位的亲和性，但必须结合整体寒热虚实，不可机械套用。

5. **天人相应与动态调摄**  
   - 四时（春生、夏长、秋收、冬藏）、地域（东西南北中）、情志（喜怒思悲恐）均会影响五脏气机。指导养生时，必问作息、饮食偏好、情绪波动及居住环境，将五行模型作为"时空—人体"全息坐标，而非僵化标签。

**应答风格与输出要求：**  
- 语言凝练，现代书面语表达，直指临床关键，客观平实，不要使用”极其“”严重“等情感描述，不堆砌原文，但每一条建议必明示其经典出处逻辑（如"此依《素问》五色法""此遵《难经》补母法"）。  
- 遇到复杂案例，先断五行生克失调之环节，再定补泻先后、传变防范，最后给出具体药、食、穴或生活调整方案。  
- 对现代人常见的亚健康、慢性病，善于化繁为简，用五行模型给出清晰的可操作路径，同时强调"辨证为前提，个体化为准则"。`


// 五行文字动画组件
function FiveElementsAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const elements = ['金', '木', '水', '火', '土']
    let currentIndex = 0
    let opacity = 0
    let phase = 'fadeIn' // 'fadeIn', 'show', 'fadeOut'
    let frameCount = 0

    const colors = [
      { r: 255, g: 223, b: 186 }, // 金 - 金色
      { r: 176, g: 224, b: 176 }, // 木 - 绿色
      { r: 173, g: 216, b: 230 }, // 水 - 蓝色
      { r: 255, g: 182, b: 193 }, // 火 - 红色
      { r: 222, g: 184, b: 135 }, // 土 - 棕色
    ]

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const color = colors[currentIndex]
      
      // 根据阶段调整透明度
      if (phase === 'fadeIn') {
        opacity += 0.03
        if (opacity >= 1) {
          opacity = 1
          phase = 'show'
          frameCount = 0
        }
      } else if (phase === 'show') {
        frameCount++
        if (frameCount >= 40) {
          phase = 'fadeOut'
        }
      } else if (phase === 'fadeOut') {
        opacity -= 0.03
        if (opacity <= 0) {
          opacity = 0
          currentIndex = (currentIndex + 1) % elements.length
          phase = 'fadeIn'
        }
      }

      // 绘制文字 - 白色
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.font = 'bold 45px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // 白色主体
      ctx.fillStyle = '#ffffff'
      ctx.fillText(elements[currentIndex], canvas.width / 2, canvas.height / 2-2)
      
      // 渐变光晕
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, 60
      )
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.4})`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      className="drop-shadow-lg"
    />
  )
}

// 五行雷达图组件
function FiveElementsRadarChart({ resultData }: { resultData: any }) {
  const elements = [
    { key: '金', name: '金', color: '#d4af37' },
    { key: '木', name: '木', color: '#228b22' },
    { key: '水', name: '水', color: '#1e90ff' },
    { key: '火', name: '火', color: '#dc143c' },
    { key: '土', name: '土', color: '#8b4513' },
  ]

  const centerX = 150
  const centerY = 150
  const maxRadius = 120
  const levels = 5 // 5个同心圆层级

  // 对数转换函数：将0-100分转换为0-1的径向比例
  // 增强20-30分区间的区分度
  const logTransform = (value: number): number => {
    if (value <= 0) return 0
    if (value >= 100) return 1
    
    // 使用对数函数，让低分区域更敏感
    // 调整参数使得20-30分区间的差距被放大
    // logBase = 10，value从0-100映射到log(1)-log(101)
    // 然后调整输出范围，使得低分区域占比更大
    
    // 分段映射：
    // 0-20分：线性映射到0-0.3（占30%半径）
    // 20-30分：放大区分度，映射到0.3-0.6（占30%半径）
    // 30-100分：对数压缩映射到0.6-1（占40%半径）
    
    if (value <= 20) {
      return (value / 20) * 0.3
    } else if (value <= 30) {
      return 0.3 + ((value - 20) / 10) * 0.3
    } else {
      // 30-100：使用对数压缩
      // log(30)=1.477, log(100)=2 → 范围0.523
      const log30 = Math.log10(30)
      const log100 = Math.log10(100)
      const logValue = Math.log10(value)
      return 0.6 + ((logValue - log30) / (log100 - log30)) * 0.4
    }
  }

  // 计算极坐标点
  const getPoint = (index: number, value: number, total: number = 5) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2 // 从顶部开始
    const radius = logTransform(value) * maxRadius
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }

  // 生成多边形路径
  const generatePath = (getData: (key: string, index: number) => number) => {
    const points = elements.map((el, index) => {
      const value = getData(el.key, index)
      return getPoint(index, value)
    })
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  }

  // 实际得分路径
  const actualPath = generatePath((key) => resultData[key]?.finalScore || 0)
  // 基准值路径
  const basePath = generatePath((key) => resultData[key]?.base || 50)

  return (
    <div className="flex flex-col items-center">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* 背景同心圆 */}
        {Array.from({ length: levels }).map((_, i) => (
          <circle
            key={`circle-${i}`}
            cx={centerX}
            cy={centerY}
            r={maxRadius * ((i + 1) / levels)}
            fill="none"
            stroke="#e8ddd0"
            strokeWidth="1"
          />
        ))}
        
        {/* 网格线（从中心到各个顶点） */}
        {elements.map((_, index) => {
          const point = getPoint(index, 100)
          return (
            <line
              key={`grid-${index}`}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="#e8ddd0"
              strokeWidth="1"
            />
          )
        })}
        
        {/* 基准值区域 */}
        <path
          d={basePath}
          fill="rgba(160, 128, 96, 0.15)"
          stroke="#a08060"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        
        {/* 实际得分区域 */}
        <path
          d={actualPath}
          fill="rgba(214, 203, 173, 0.4)"
          stroke="#d6cbad"
          strokeWidth="2.5"
        />
        
        {/* 维度标签和得分点 */}
        {elements.map((el, index) => {
          const labelPoint = getPoint(index, 115)
          const actualPoint = getPoint(index, resultData[el.key]?.finalScore || 0)
          const basePoint = getPoint(index, resultData[el.key]?.base || 50)
          
          return (
            <g key={`label-${index}`}>
              {/* 实际得分点 */}
              <circle
                cx={actualPoint.x}
                cy={actualPoint.y}
                r="5"
                fill={el.color}
                stroke="#fff"
                strokeWidth="1.5"
              />
              {/* 基准值点 */}
              <circle
                cx={basePoint.x}
                cy={basePoint.y}
                r="3.5"
                fill="none"
                stroke="#a08060"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
              {/* 维度名称 */}
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={el.color}
                fontSize="16"
                fontWeight="bold"
              >
                {el.name}
              </text>
              {/* 实际分数标签 */}
              <text
                x={actualPoint.x}
                y={actualPoint.y - 12}
                textAnchor="middle"
                fill={el.color}
                fontSize="11"
                fontWeight="600"
              >
                {resultData[el.key]?.finalScore || 0}
              </text>
            </g>
          )
        })}
        
        {/* 中心原点 */}
        <circle cx={centerX} cy={centerY} r="3" fill="#c9a090" />
      </svg>
      
      {/* 图例 */}
      <div className="flex gap-6 mt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1" style={{ backgroundColor: '#d6cbad', borderRadius: '1px' }} />
          <span style={{ color: '#6a5a4a' }}>实际得分</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 border-t-2 border-dashed" style={{ borderColor: '#a08060' }} />
          <span style={{ color: '#6a5a4a' }}>基准值</span>
        </div>
      </div>
    </div>
  )
}

// 五行分数展示组件（保留用于兼容）
function FiveElementsScores({ resultData }: { resultData: any }) {
  const elements = [
    { key: '金', name: '金', color: '#d4af37', bgColor: 'rgba(212, 175, 55, 0.1)' },
    { key: '木', name: '木', color: '#228b22', bgColor: 'rgba(34, 139, 34, 0.1)' },
    { key: '水', name: '水', color: '#1e90ff', bgColor: 'rgba(30, 144, 255, 0.1)' },
    { key: '火', name: '火', color: '#dc143c', bgColor: 'rgba(220, 20, 60, 0.1)' },
    { key: '土', name: '土', color: '#8b4513', bgColor: 'rgba(139, 69, 19, 0.1)' },
  ]

  return (
    <div className="grid grid-cols-5 gap-2 mb-6">
      {elements.map((el) => {
        const score = resultData[el.key]?.finalScore || 0
        return (
          <div key={el.key} className="text-center">
            <div 
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold mb-1"
              style={{ 
                backgroundColor: el.bgColor,
                color: el.color,
                border: `2px solid ${el.color}`
              }}
            >
              {el.name}
            </div>
            <div className="text-sm font-bold" style={{ color: el.color }}>
              {score}分
            </div>
            <div 
              className="w-full h-1.5 rounded-full mt-1"
              style={{ backgroundColor: el.bgColor }}
            >
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${score}%`,
                  backgroundColor: el.color
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Markdown 渲染组件
function MarkdownDisplay({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 text-[#5a4a3a]">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 text-[#5a4a3a]">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-2 text-[#6a5a4a]">{children}</h3>,
          p: ({ children }) => <p className="text-[#7a6a5a] leading-relaxed mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-[#7a6a5a]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-[#7a6a5a]">{children}</ol>,
          li: ({ children }) => <li className="text-[#7a6a5a]">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-[#5a4a3a]">{children}</strong>,
          em: ({ children }) => <em className="italic text-[#8a7a6a]">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#d6cbad] pl-3 my-2 py-1 bg-[#faf7f2] text-[#7a6a5a] italic text-sm">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-[#f5f0e8] px-1 py-0.5 rounded text-xs text-[#a08060] font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-[#2a2a2a] text-[#e0d8c8] p-2 rounded text-xs font-mono overflow-x-auto my-2">
                {children}
              </code>
            )
          },
          hr: () => <hr className="border-[#e8ddd0] my-3" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border border-[#e8ddd0] rounded-lg overflow-hidden text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#faf7f2]">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-[#e8ddd0] px-3 py-1.5 text-left font-semibold text-[#5a4a3a] text-xs">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[#f5f0e8] px-3 py-1.5 text-[#7a6a5a] text-xs">{children}</td>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-[#c9a090] hover:text-[#d6cbad] underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function buildUserMessage(obj: any,info:any): string {
  const userMessage=`这是一个专业的人体五行能量量表测试，分为金木水火土五个维度，总分100分，
  每个维度都有对应的基准分，基准分代表这个维度的平衡状态，高或者低、偏离的程度都代表一种失衡状态，代表五行对应的人体能量有需要调整的地方
  五个维度的测试结果如下：
  金：总分${obj['金'].finalScore}分，基准分${obj['金'].base}分，偏离${obj['金'].finalScore - obj['金'].base}分
  木：总分${obj['木'].finalScore}分，基准分${obj['木'].base}分，偏离${obj['木'].finalScore - obj['木'].base}分
  水：总分${obj['水'].finalScore}分，基准分${obj['水'].base}分，偏离${obj['水'].finalScore - obj['水'].base}分
  火：总分${obj['火'].finalScore}分，基准分${obj['火'].base}分，偏离${obj['火'].finalScore - obj['火'].base}分
  土：总分${obj['土'].finalScore}分，基准分${obj['土'].base}分，偏离${obj['土'].finalScore - obj['土'].base}分
  根据测试结果的量化分析，集合用户姓名${info.name}，${info.birthDate?'出生日期'+info.birthDate:''}，${info.location?'所在地区'+info.location:''}，和当前时令${new Date().toLocaleString()}，按以下方式输出总结报告，现代汉语表达，如果引用古典论述要解释，行文自然不要有框架模版感觉，不要用表情符号
  # 总体状态
  {一句话总结测试结果，有启发性，吸引人继续阅读报告}
  # 能量分析
  {按五行五个维度，细致深入分析，要有理有据和专业性，不能只说结果，要分析出每个维度的失衡状态，以及失衡的原因和影响}
  ## 金分析
  {分析金维度的平衡或失衡状态，以及失衡的原因和影响}
  ## 木分析
  {分析木维度的平衡或失衡状态，以及失衡的原因和影响}
  ## 水分析
  {分析水维度的平衡或失衡状态，以及失衡的原因和影响}
  ## 火分析
  {分析火维度的平衡或失衡状态，以及失衡的原因和影响}
  ## 土分析
  {分析土维度的平衡或失衡状态，以及失衡的原因和影响}
   # 五行建议
  {根据测试结果，给出具体的调整建议，包括调整的维度、调整的方向、调整的幅度等，高屋建瓴和实战落地相结合，让人觉得有道理并可以具体操作}
  ## 寄语
  {一句话金句总结}
  `;
  console.log('userMessage',userMessage)
  return userMessage;
}


const imagePrompts=[
  "唐代青绿山水风格，李思训笔法，金碧辉煌，勾勒填彩，矿物颜料，繁密富丽，长卷构图，盛唐气象，敦煌壁画色彩，中国古代绘画杰作，8k分辨率，极其精细。",
"北宋范宽风格，全景式山水，雨点皴，山顶好作密林，溪水潺潺，雾气蒸腾，北方深秋景色，绢本水墨，雄浑壮阔，高远构图，宋代院体画，大师之作，超高清。",
"南宋马远风格，水墨苍劲，大斧劈皴，边角之景，一湾清水，半边古木，孤寂清幽，禅意，纸本水墨，大量留白，文人雅趣，宋代美学，杰作。",
"元代黄公望笔意，披麻皴，浅绛设色，干笔皴擦，林木幽深，寒潭映翠，隐士情怀，荒寒萧疏，元四家风格，文人画，古意盎然，高清扫描质感。",
"战国帛画风格，朱砂与石青设色，线条古拙，龙凤图腾，云气缭绕，神秘诡谲，祭祀感，楚文化风格，考古复原，破损绢本质感，极高的艺术价值。",
"清代八大山人风格，极简水墨，鱼鸟之态，翻白眼，枯木寒水，构图奇崛，笔墨凝练，冷逸孤傲，大写意，中国美术馆藏级，超清细节。"
]


export default function EvaluationPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<EvaluationSetting[]>([])
  const [currentStep, setCurrentStep] = useState(0) // 0 = 基本信息页，1~N = 题目页
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    name: '',
    birthDate: '',
    location: '',
  })
  const [answers, setAnswers] = useState<Record<string, number>>({})
  
  // 结果相关状态
  const [showResult, setShowResult] = useState(false)
  const [resultData, setResultData] = useState<any>(null)
  const [aiResult, setAiResult] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  // 图片生成相关状态
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  // 音乐相关状态
  const [musicUrl, setMusicUrl] = useState<string | null>(null)
  const [musicElement, setMusicElement] = useState<HTMLAudioElement | null>(null)

  // 加载评价设置
  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/evaluation')
      const data = await res.json()
      setSettings(data.settings || [])
    } catch (error) {
      console.error('加载评价设置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 生成五行能量图片
  async function generateFiveElementsImage(fullAnalysis: string = '') {
    setIsGeneratingImage(true)

    try {
      const message = [
        {
          role: 'user',
          content: `根据以下五行能量分析结果,总结符合这个结果的五行的意象描述，20字以内，五行分析结果：${fullAnalysis}`,
        },
      ]
      const postData = {
        messages: message,
      }
      const responseFirst = await fetch('/api/ai/tuning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })
      const resResult=await responseFirst.json()


      const randomPrompt = imagePrompts[Math.floor(Math.random() * imagePrompts.length)]
      const prompt = `主题:${resResult.response}
      生成一张以下风格的艺术图片：${randomPrompt}`

      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.imageUrl) {
          setGeneratedImage(data.imageUrl)
        }
      }
    } catch (error) {
      console.error('生成图片失败:', error)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // 根据五行获取音乐 URL
  async function fetchMusicUrl(element: string) {
    try {
      const musics: Record<string, string> = {
        '金': '母带-秋·风起时·坚韧之金',
        '木': '母带-春·万物生·解忧之木',
        '水': '母带-冬·山海寒·疗愈之水',
        '火': '母带-夏·山林繁·活力之火',
        '土': '母带-长夏·归大地·沉稳之土',
      }
      
      const musicName = musics[element]
      if (!musicName) return

      const response = await fetch(`/api/toc-data/url?name=${encodeURIComponent(musicName)}`)
      const data = await response.json()
      
      if (data.success && data.url) {
        setMusicUrl(data.url)
      }
    } catch (error) {
      console.error('获取音乐 URL 失败:', error)
    }
  }

  // 流式 API 调用
  async function streamAIEvaluation(postData: any) {
    setIsStreaming(true)
    setStreamError(null)
    setAiResult('')
    
    let fullResult = '' // 本地变量存储完整的分析结果

    try {
      const response = await fetch('/api/ai/tuning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = '' // 用于存储不完整的行

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        // 保留最后一个可能不完整的块
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'chunk') {
                // 流式输出片段 - 同时更新本地变量和状态
                fullResult += data.data
                setAiResult(fullResult)
              } else if (data.type === 'done') {
                // 完成
                setIsStreaming(false)
                // 生成五行能量图片（使用本地存储的完整分析结果）
                generateFiveElementsImage(fullResult)
              } else if (data.type === 'error') {
                // 错误
                setStreamError(data.error || 'AI 生成失败')
                setIsStreaming(false)
              }
            } catch (e) {
              // 忽略解析错误的行
              console.warn('SSE 行解析失败:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error('流式请求错误:', error)
      setStreamError(error instanceof Error ? error.message : '请求失败')
      setIsStreaming(false)
    }
  }

  const totalSteps = settings.length + 1 // 基本信息页 + 所有题目页
  const progress = (currentStep / Math.max(totalSteps - 1, 1)) * 100

  // 处理基本信息变化
  const handleBasicInfoChange = (field: keyof BasicInfo, value: string) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }))
  }

  // 处理选项选择 - 保存score并自动跳到下一页
  const handleAnswerSelect = (questionId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }))
    // 如果当前不是最后一题，自动跳到下一页
    if (currentStep < totalSteps - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
      }, 300) // 300ms 延迟让用户看到选中的反馈
    }
  }

  // 上一题
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 下一题
  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // 提交完成，计算结果并调用 AI
      const handledSettingsData = handleSettings(settings)
      const calculatedResultData: any = {
        '金': { score: 0, maxScore: 0,base:20 },
        '木': { score: 0, maxScore: 0,base:20 },
        '水': { score: 0, maxScore: 0,base:15 },
        '火': { score: 0, maxScore: 0,base:25 },
        '土': { score: 0, maxScore: 0,base:20 },
      }
      Object.keys(handledSettingsData).forEach(key => {
        let itemType = handledSettingsData[key].type
        if (calculatedResultData[itemType]) {
          calculatedResultData[itemType].score += answers[key] * handledSettingsData[key].weight
          calculatedResultData[itemType].maxScore += handledSettingsData[key].maxScore * handledSettingsData[key].weight
        }
      })
      Object.keys(calculatedResultData).forEach(key => {
        calculatedResultData[key].finalScore = Math.round(
          (calculatedResultData[key].score / calculatedResultData[key].maxScore) * 100
        )
      })
      if (calculatedResultData['木'].finalScore > 70 && calculatedResultData['土'].finalScore < 40) {
        calculatedResultData['木'].finalScore = Math.round(calculatedResultData['木'].finalScore * 0.9)
      }
      if (calculatedResultData['火'].finalScore > 65 && calculatedResultData['水'].finalScore > 65) {
        calculatedResultData['火'].finalScore = Math.round(calculatedResultData['火'].finalScore * 0.7)
        calculatedResultData['水'].finalScore = Math.round(calculatedResultData['水'].finalScore * 0.7)
      }
      
      const message = [
        {
          role: 'system',
          content: EVALUATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: buildUserMessage(calculatedResultData,basicInfo),
        },
      ]
      const postData = {
        stream: true,
        messages: message,
      }
      
      // 保存结果并显示结果页
      setResultData(calculatedResultData)
      setShowResult(true)
      
      // 找到 finalScore 最大值对应的五行
      let maxElement = '土'
      let maxScore = -1
      Object.keys(calculatedResultData).forEach((key) => {
        const score = calculatedResultData[key]?.finalScore ?? -1
        if (score > maxScore) {
          maxScore = score
          maxElement = key
        }
      })
      
      // 请求音乐 URL（与 AI 生成并行执行）
      fetchMusicUrl(maxElement)
      
      // 开始流式 AI 生成
      streamAIEvaluation(postData)
    }
  }

  function handleSettings(data: any) {
    let result: any = {}
    data.forEach((item: any) => {
      let options = parseOptions(item.options)
      // 获取options里item.score最大值
      let maxScore = Math.max(...options.map((option: any) => option.score))
      result[item.id] = {
        weight: item.weight,
        type: item.type,
        maxScore: maxScore,
      }
    })
    return result
  }

  // 判断是否可以进入下一页
  const canProceed = () => {
    if (currentStep === 0) {
      // 基本信息页：姓名必填
      return basicInfo.name.trim().length > 0
    } else {
      // 题目页：必须选择一个选项
      const currentQuestion = settings[currentStep - 1]
      return currentQuestion?.id ? answers[currentQuestion.id] !== undefined : false
    }
  }

  // 解析选项 - 解析为{text, score}数组
  const parseOptions = (optionsStr?: string | null): Option[] => {
    if (!optionsStr) return []
    try {
      const parsed = JSON.parse(optionsStr)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  // 重新测评
  const handleRestart = () => {
    setShowResult(false)
    setCurrentStep(0)
    setAnswers({})
    setAiResult('')
    setResultData(null)
    setStreamError(null)
    // 重置图片生成状态
    setGeneratedImage(null)
    setIsGeneratingImage(false)
    // 重置音乐状态
    setMusicUrl(null)
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f5f2ea 0%, #f7edea 50%, #faf5f0 100%)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#e6c4bb', borderTopColor: 'transparent' }}
          />
          <p
            className="font-medium"
            style={{ color: '#b8a080' }}
          >
            加载中...
          </p>
        </div>
      </div>
    )
  }

  // 结果页
  if (showResult) {
    return (
      <div
        className="min-h-screen pb-8"
        style={{ background: 'linear-gradient(135deg, #f5f2ea 0%, #f7edea 50%, #faf5f0 100%)' }}
      >
        {/* 顶部标题栏 */}
        <header
          className="sticky top-0 z-50 backdrop-blur-md shadow-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderBottom: '1px solid #e8ddd0',
          }}
        >
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1
              className="text-xl font-bold text-center"
              style={{
                background: 'linear-gradient(135deg, #b8a080 0%, #c9a090 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ✨ 五行能量测评报告 ✨
            </h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6">
          {/* 用户信息 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4" style={{ borderColor: '#e8ddd0' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d6cbad 0%, #e6c4bb 100%)' }}
              >
                <span className="text-white font-bold text-lg">{basicInfo.name.charAt(0)}</span>
              </div>
              <div>
                <div className="font-bold text-[#5a4a3a]">{basicInfo.name}</div>
                {basicInfo.birthDate && (
                  <div className="text-xs text-[#a08060]">出生日期：{basicInfo.birthDate}</div>
                )}
                {basicInfo.location && (
                  <div className="text-xs text-[#a08060]">居住地：{basicInfo.location}</div>
                )}
              </div>
            </div>
          </div>

          {/* 五行分数展示 - 雷达图 */}
          {resultData && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4" style={{ borderColor: '#e8ddd0' }}>
              <h2 className="text-base font-bold mb-2 text-center" style={{ color: '#5a4a3a' }}>
                五行能量分布
              </h2>
              <FiveElementsRadarChart resultData={resultData} />
            </div>
          )}

          {/* 音乐播放器 - 自动播放 */}
          {musicUrl && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4" style={{ borderColor: '#e8ddd0' }}>
              <h2 className="text-base font-bold mb-3 text-center" style={{ color: '#5a4a3a' }}>
                五行能量音乐
              </h2>
              
              {/* Canvas 音阶动画 */}
              <div className="flex justify-center mb-4">
                <canvas 
                  ref={(canvas) => {
                    if (canvas && musicUrl) {
                      const ctx = canvas.getContext('2d')
                      if (!ctx) return
                      
                      canvas.width = Math.min(window.innerWidth * 0.8, 400)
                      canvas.height = 20
                      
                      const barCount = 64
                      const barWidth = canvas.width / barCount - 2
                      const bars: number[] = new Array(barCount).fill(20)
                      const colors: string[] = []
                      
                      // 生成随机颜色
                      for (let i = 0; i < barCount; i++) {
                        const hue = Math.random() * 60 + 20 // 暖色调
                        colors.push(`hsl(${hue}, 70%, 60%)`)
                      }
                      
                      let animationId: number
                      
                      const animate = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        
                        // 绘制背景
                        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
                        gradient.addColorStop(0, '#faf7f2')
                        gradient.addColorStop(1, '#f5f0e8')
                        ctx.fillStyle = gradient
                        ctx.fillRect(0, 0, canvas.width, canvas.height)
                        
                        // 更新和绘制每个柱状图
                        for (let i = 0; i < barCount; i++) {
                          // 随机变化高度
                          const change = (Math.random() - 0.5) * 15
                          bars[i] = Math.max(5, Math.min(55, bars[i] + change))
                          
                          // 随机变化颜色
                          if (Math.random() > 0.95) {
                            const hue = Math.random() * 60 + 20
                            colors[i] = `hsl(${hue}, 70%, ${50 + Math.random() * 20}%)`
                          }
                          
                          const x = i * (barWidth + 2)
                          const barHeight = bars[i]
                          const y = canvas.height - barHeight
                          
                          // 绘制柱状图渐变
                          const barGradient = ctx.createLinearGradient(x, y, x, canvas.height)
                          barGradient.addColorStop(0, colors[i])
                          barGradient.addColorStop(1, '#d6cbad')
                          ctx.fillStyle = barGradient
                          
                          // 圆角柱状图
                          const radius = 3
                          ctx.beginPath()
                          ctx.moveTo(x + radius, y)
                          ctx.lineTo(x + barWidth - radius, y)
                          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius)
                          ctx.lineTo(x + barWidth, canvas.height - 2)
                          ctx.lineTo(x, canvas.height - 2)
                          ctx.lineTo(x, y + radius)
                          ctx.quadraticCurveTo(x, y, x + radius, y)
                          ctx.closePath()
                          ctx.fill()
                        }
                        
                        animationId = requestAnimationFrame(animate)
                      }
                      
                      animate()
                    }
                  }}
                  style={{

                  }}
                />
              </div>
              
              {/* 音频元素（隐藏） */}
              <audio 
                ref={(el) => {
                  if (el) {
                    ;(window as any).musicAudio = el
                    el.volume = 0.3 // 设置默认音量为 30%
                    // 添加 ended 事件确保循环播放
                    el.addEventListener('ended', () => {
                      el.currentTime = 0
                      el.play().catch((e) => {
                        console.log('重新播放失败:', e)
                      })
                    })
                    el.play().catch((e) => {
                      console.log('自动播放被浏览器阻止:', e)
                    })
                  }
                }}
                src={musicUrl}
                loop
                style={{ display: 'none' }}
              />
              
              {/* 控制按钮 */}
            </div>
          )}

          {/* AI 分析结果 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8ddd0' }}>
             <h2 className="text-base font-bold mb-4 text-center" style={{ color: '#5a4a3a' }}>
                五行能量分析
            </h2>
            <div className="flex items-center justify-between mb-4">

              {isStreaming && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#d6cbad', borderTopColor: 'transparent' }}
                  />
                  <span className="text-xs" style={{ color: '#a08060' }}>
                    正在分析...
                  </span>
                </div>
              )}
            </div>

            {streamError ? (
              <div className="text-center py-8" style={{ color: '#dc143c' }}>
                <p className="mb-2">生成失败：{streamError}</p>
                <button
                  onClick={() => resultData && streamAIEvaluation({
                    stream: true,
                    messages: [
                      { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
                      { role: 'user', content: buildUserMessage(resultData) },
                    ],
                  })}
                  className="text-sm underline"
                  style={{ color: '#c9a090' }}
                >
                  重新生成
                </button>
              </div>
            ) : aiResult ? (
              <MarkdownDisplay content={aiResult} />
            ) : isStreaming ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#d6cbad', borderTopColor: 'transparent' }}
                  />
                  <span style={{ color: '#a08060' }}>正在为您生成个性化分析报告...</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: '#a08060' }}>
                暂无分析结果
              </div>
            )}
            {isGeneratingImage ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div
                    className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mb-3"
                    style={{ borderColor: '#d6cbad', borderTopColor: 'transparent' }}
                  />
                  <span style={{ color: '#a08060' }}>正在绘制您的专属五行能量意象...</span>
                </div>
            ):null}
            {generatedImage ? (
                <div className="relative rounded-xl overflow-hidden shadow-md">
                  <img
                    src={generatedImage}
                    alt="五行能量图谱"
                    className="w-full h-auto object-cover"
                    style={{ borderRadius: '0.75rem' }}
                  />
                </div>
            ) : null}

          </div>

          {/* 重新测评按钮 */}
          <div className="mt-6">
            <button
              onClick={handleRestart}
              className="w-full py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:shadow-md"
              style={{
                background: 'linear-gradient(135deg, #d6cbad 0%, #e6c4bb 100%)',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(214, 203, 173, 0.35)',
              }}
            >
              重新测评
            </button>
          </div>
        </main>

        {/* 全局样式 */}
        <style jsx global>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.4s ease-out;
          }
          input::placeholder {
            color: #b0a090;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #f5f2ea 0%, #f7edea 50%, #faf5f0 100%)' }}
    >
      {/* 顶部标题栏 */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md shadow-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderBottom: '1px solid #e8ddd0',
        }}
      >
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1
            className="text-xl font-bold text-center"
            style={{
              background: 'linear-gradient(135deg, #b8a080 0%, #c9a090 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ✨ 五行能量测评 ✨
          </h1>
        </div>
      </header>

      {/* 进度条 */}
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium"
            style={{ color: '#a08060', display: 'none' }}
          >
            进度 {currentStep + 1} / {totalSteps}
          </span>
          <span className="text-sm" style={{ color: '#888', display: 'none' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: '#f0e8dc' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #d6cbad 0%, #e6c4bb 100%)',
            }}
          />
        </div>
      </div>

      {/* 主内容区 */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* 基本信息页 */}
        {currentStep === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #d6cbad 0%, #e6c4bb 100%)',
                  boxShadow: '0 8px 24px rgba(214, 203, 173, 0.3)',
                }}
              >
                <FiveElementsAnimation />
              </div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: '#5a4a3a' }}
              >
                欢迎您
              </h2>
              <p style={{ color: '#8a7a6a' }}>
                请填写基本信息，开始您的五行能量之旅
              </p>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-2xl p-4 shadow-sm border"
                style={{
                  backgroundColor: '#fff',
                  borderColor: '#e8ddd0',
                }}
              >
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#6a5a4a' }}
                >
                  您的姓名 <span style={{ color: '#c9a090' }}>*</span>
                </label>
                <input
                  type="text"
                  value={basicInfo.name}
                  onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                  placeholder="请输入您的姓名"
                  className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                  style={{
                    backgroundColor: '#faf7f2',
                    border: '1px solid #e8ddd0',
                    color: '#5a4a3a',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d6cbad'
                    e.target.style.boxShadow = '0 0 0 3px rgba(214, 203, 173, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e8ddd0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div
                className="rounded-2xl p-4 shadow-sm border"
                style={{
                  backgroundColor: '#fff',
                  borderColor: '#e8ddd0',
                }}
              >
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#6a5a4a' }}
                >
                  出生日期
                </label>
                <input
                  type="date"
                  value={basicInfo.birthDate}
                  onChange={(e) => handleBasicInfoChange('birthDate', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                  style={{
                    backgroundColor: '#faf7f2',
                    border: '1px solid #e8ddd0',
                    color: '#5a4a3a',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d6cbad'
                    e.target.style.boxShadow = '0 0 0 3px rgba(214, 203, 173, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e8ddd0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div
                className="rounded-2xl p-4 shadow-sm border"
                style={{
                  backgroundColor: '#fff',
                  borderColor: '#e8ddd0',
                }}
              >
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#6a5a4a' }}
                >
                  居住地
                </label>
                <input
                  type="text"
                  value={basicInfo.location}
                  onChange={(e) => handleBasicInfoChange('location', e.target.value)}
                  placeholder="如：北京市朝阳区"
                  className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                  style={{
                    backgroundColor: '#faf7f2',
                    border: '1px solid #e8ddd0',
                    color: '#5a4a3a',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d6cbad'
                    e.target.style.boxShadow = '0 0 0 3px rgba(214, 203, 173, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e8ddd0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 题目页 */}
        {currentStep > 0 && settings[currentStep - 1] && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 shadow-md font-bold text-lg"
                style={{
                  background: 'linear-gradient(135deg, #d6cbad 0%, #e6c4bb 100%)',
                  color: '#fff',
                }}
              >
                {currentStep}
              </span>
              <h2
                className="text-lg font-bold"
                style={{ color: '#5a4a3a' }}
              >
                {settings[currentStep - 1].question}
              </h2>
            </div>

            <div className="space-y-3">
              {parseOptions(settings[currentStep - 1].options).map((option, index) => {
                const questionId = settings[currentStep - 1].id
                const isSelected = answers[questionId] === option.score

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(questionId, option.score)}
                    className="w-full p-4 rounded-2xl text-left transition-all duration-300 border-2"
                    style={{
                      backgroundColor: isSelected ? 'transparent' : '#fff',
                      borderColor: isSelected ? 'transparent' : '#e8ddd0',
                      color: isSelected ? '#fff' : '#5a4a3a',
                      background: isSelected
                        ? 'linear-gradient(135deg, #d6cbad 0%, #e6c4bb 100%)'
                        : undefined,
                      boxShadow: isSelected ? '0 8px 24px rgba(214, 203, 173, 0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f5f0e8',
                          color: isSelected ? '#fff' : '#a08060',
                        }}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1 font-medium">{option.text}</span>
                      {isSelected && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* 底部导航按钮 */}
      <footer
        className="fixed bottom-0 left-0 right-0 backdrop-blur-md border-t"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: '#e8ddd0',
        }}
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:shadow-md"
              style={{
                backgroundColor: '#f5f0e8',
                color: '#a08060',
              }}
            >
              上一题
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300"
            style={canProceed()
              ? {
                  background: 'linear-gradient(135deg, #d6cbad 0%, #e6c4bb 100%)',
                  color: '#fff',
                  boxShadow: '0 8px 24px rgba(214, 203, 173, 0.35)',
                }
              : {
                  backgroundColor: '#e8e2d8',
                  color: '#aaa',
                  cursor: 'not-allowed',
                }}
          >
            {currentStep === totalSteps - 1 ? '完成' : '下一题'}
          </button>
        </div>
      </footer>

      {/* 全局样式 */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        input::placeholder {
          color: #b0a090;
        }
      `}</style>
    </div>
  )
}
