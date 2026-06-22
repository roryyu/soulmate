'use client'

import { useState, useRef } from 'react'

interface Question {
  id: number
  type: 'single' | 'multiple' | 'fill'
  title: string
  options?: string[]
  answer: string | string[]
  explanation: string
}

const questions: Question[] = [
  {
    id: 1,
    type: 'single',
    title: '公司成立于哪一年？',
    options: ['2018', '2019', '2020', '2021'],
    answer: '2019',
    explanation: '公司成立于2019年，致力于打造健康科技服务平台。'
  },
  {
    id: 2,
    type: 'multiple',
    title: '公司的核心价值观包括哪些？（多选）',
    options: ['用户至上', '创新驱动', '诚信正直', '共赢共享'],
    answer: ['用户至上', '创新驱动', '诚信正直', '共赢共享'],
    explanation: '公司的核心价值观是用户至上、创新驱动、诚信正直、共赢共享。'
  },
  {
    id: 3,
    type: 'fill',
    title: '公司使命是让每一个人都能享受____科技服务。',
    answer: '健康',
    explanation: '公司使命是让每一个人都能享受健康科技服务。'
  },
  {
    id: 4,
    type: 'single',
    title: '以下哪个是公司的旗舰产品？',
    options: ['Soulmates App', 'Health Pro', 'Music Plus', 'Smart Diary'],
    answer: 'Soulmates App',
    explanation: 'Soulmates App是公司的旗舰产品，提供全方位的健康管理服务。'
  },
  {
    id: 5,
    type: 'multiple',
    title: '公司业务涵盖哪些领域？（多选）',
    options: ['心理健康', '音乐疗愈', '运动健康', '饮食管理'],
    answer: ['心理健康', '音乐疗愈', '运动健康', '饮食管理'],
    explanation: '公司业务涵盖心理健康、音乐疗愈、运动健康、饮食管理等领域。'
  },
  {
    id: 6,
    type: 'fill',
    title: '用户满意度目标是达到____%以上。',
    answer: '95',
    explanation: '用户满意度目标是达到95%以上，持续提升服务质量。'
  },
  {
    id: 7,
    type: 'single',
    title: '客户服务响应时间标准是？',
    options: ['1小时内', '2小时内', '4小时内', '8小时内'],
    answer: '2小时内',
    explanation: '客户服务响应时间标准是2小时内，及时解决客户问题。'
  },
  {
    id: 8,
    type: 'multiple',
    title: '优质服务标准包括哪些？（多选）',
    options: ['专业', '热情', '高效', '贴心'],
    answer: ['专业', '热情', '高效', '贴心'],
    explanation: '优质服务标准包括专业、热情、高效、贴心四个维度。'
  },
  {
    id: 9,
    type: 'fill',
    title: '产品迭代周期为每____个月更新一次大版本。',
    answer: '3',
    explanation: '产品迭代周期为每3个月更新一次大版本，持续优化用户体验。'
  },
  {
    id: 10,
    type: 'single',
    title: '员工年度培训时长要求不低于多少小时？',
    options: ['20小时', '40小时', '60小时', '80小时'],
    answer: '40小时',
    explanation: '员工年度培训时长要求不低于40小时，持续提升专业能力。'
  }
]

export default function ExamPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [showResult, setShowResult] = useState(false)
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectSingle = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value })
  }

  const selectMultiple = (value: string) => {
    const currentAnswer = answers[questions[currentQuestion].id] as string[] || []
    let newAnswer
    if (currentAnswer.includes(value)) {
      newAnswer = currentAnswer.filter(item => item !== value)
    } else {
      newAnswer = [...currentAnswer, value]
    }
    setAnswers({ ...answers, [questions[currentQuestion].id]: newAnswer })
  }

  const fillAnswer = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value })
  }

  const checkAnswer = (questionId: number) => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return false

    const userAnswer = answers[questionId]

    if (question.type === 'multiple') {
      const userAnswers = userAnswer as string[]
      const correctAnswers = question.answer as string[]
      if (userAnswers.length !== correctAnswers.length) return false
      return correctAnswers.every(answer => userAnswers.includes(answer))
    } else {
      return userAnswer === question.answer
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResult(true)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const toggleExplanation = (questionId: number) => {
    setShowExplanation({ ...showExplanation, [questionId]: !showExplanation[questionId] })
  }

  const restartExam = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setShowResult(false)
    setShowExplanation({})
  }

  const getScore = () => {
    let score = 0
    questions.forEach(question => {
      if (checkAnswer(question.id)) score++
    })
    return score
  }

  const getAnswerStatus = (questionId: number) => {
    if (!(questionId in answers)) return 'none'
    return checkAnswer(questionId) ? 'correct' : 'wrong'
  }

  const renderQuestion = (question: Question) => {
    const userAnswer = answers[question.id]

    return (
      <div key={question.id} className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
            {question.id}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            {question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : '填空题'}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">{question.title}</h3>

        {question.type === 'single' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => selectSingle(option)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  userAnswer === option ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                } ${showResult && checkAnswer(question.id) && option === question.answer ? 'border-green-500 bg-green-50' : ''}
                ${showResult && !checkAnswer(question.id) && option === question.answer ? 'border-green-500 bg-green-50' : ''}
                ${showResult && !checkAnswer(question.id) && userAnswer === option ? 'border-red-500 bg-red-50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center border-2 rounded-full text-sm font-bold border-gray-300">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                  {showResult && option === question.answer && (
                    <span className="ml-auto text-green-500 text-xl">✓</span>
                  )}
                  {showResult && !checkAnswer(question.id) && userAnswer === option && (
                    <span className="ml-auto text-red-500 text-xl">✗</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {question.type === 'multiple' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isSelected = (userAnswer as string[])?.includes(option)
              return (
                <button
                  key={index}
                  onClick={() => selectMultiple(option)}
                  disabled={showResult}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                  } ${showResult && checkAnswer(question.id) && (question.answer as string[]).includes(option) ? 'border-green-500 bg-green-50' : ''}
                  ${showResult && !checkAnswer(question.id) && (question.answer as string[]).includes(option) ? 'border-green-500 bg-green-50' : ''}
                  ${showResult && !checkAnswer(question.id) && isSelected && !(question.answer as string[]).includes(option) ? 'border-red-500 bg-red-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center border-2 rounded text-sm font-bold border-gray-300">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                    {showResult && (question.answer as string[]).includes(option) && (
                      <span className="ml-auto text-green-500 text-xl">✓</span>
                    )}
                    {showResult && !checkAnswer(question.id) && isSelected && !(question.answer as string[]).includes(option) && (
                      <span className="ml-auto text-red-500 text-xl">✗</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {question.type === 'fill' && (
          <div className="mt-4">
            <input
              type="text"
              value={(userAnswer as string) || ''}
              onChange={(e) => fillAnswer(e.target.value)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                showResult && checkAnswer(question.id) ? 'border-green-500 bg-green-50' : ''}
                ${showResult && !checkAnswer(question.id) ? 'border-red-500 bg-red-50' : ''}
                ${!showResult ? 'border-gray-200 focus:border-pink-500' : ''}
              `}
              placeholder="请输入答案"
            />
          </div>
        )}

        {showResult && (
          <div className="mt-4">
            <button
              onClick={() => toggleExplanation(question.id)}
              className="flex items-center gap-2 text-pink-500 hover:text-pink-600"
            >
              <span>📖 查看解析</span>
              <span>{showExplanation[question.id] ? '收起' : '展开'}</span>
            </button>
            {showExplanation[question.id] && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl">
                <p className="text-gray-700">{question.explanation}</p>
                <p className="mt-2 font-semibold text-gray-900">
                  正确答案：{Array.isArray(question.answer) ? question.answer.join('、') : question.answer}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderResult = () => {
    const score = getScore()
    const percentage = Math.round((score / questions.length) * 100)
    let resultText, resultEmoji, resultColor

    if (percentage >= 90) {
      resultText = '优秀！'
      resultEmoji = '🎉'
      resultColor = 'text-green-500'
    } else if (percentage >= 80) {
      resultText = '良好！'
      resultEmoji = '👍'
      resultColor = 'text-blue-500'
    } else if (percentage >= 60) {
      resultText = '及格'
      resultEmoji = '💪'
      resultColor = 'text-yellow-500'
    } else {
      resultText = '需要加油'
      resultEmoji = '📚'
      resultColor = 'text-red-500'
    }

    return (
      <div className="py-6">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">{resultEmoji}</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">考试完成！</h2>
          <p className={`text-4xl font-bold mb-1 ${resultColor}`}>{score}/{questions.length}</p>
          <p className="text-xl text-gray-600">{percentage}分</p>
          <p className="text-lg text-gray-500 mt-2">{resultText}</p>
        </div>

        <div className="space-y-2">
          {questions.map((question, index) => {
            const status = getAnswerStatus(question.id)
            return (
              <div
                key={question.id}
                onClick={() => {
                  setCurrentQuestion(index)
                  setShowResult(false)
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  status === 'correct' ? 'bg-green-50 border border-green-200' :
                  status === 'wrong' ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">第{question.id}题</span>
                    {status === 'correct' && <span className="text-green-500 text-xl">✓</span>}
                    {status === 'wrong' && <span className="text-red-500 text-xl">✗</span>}
                    {status === 'none' && <span className="text-gray-400 text-xl">○</span>}
                  </div>
                  <span className="text-sm text-gray-500">
                    {question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : '填空题'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={restartExam}
          className="w-full mt-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          重新考试
        </button>
      </div>
    )
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
          <h1 className="text-lg font-semibold text-gray-900">
            {showResult ? '考试结果' : '员工业务知识考试'}
          </h1>
          {!showResult && (
            <p className="text-xs text-gray-500 mt-0.5">
              第 {currentQuestion + 1} 题 / 共 {questions.length} 题
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-32">
        {!showResult ? renderQuestion(questions[currentQuestion]) : renderResult()}
        <div ref={messagesEndRef} />
      </div>

      {!showResult && (
        <div className="bg-white border-t border-gray-200 px-4 py-4 fixed bottom-0 left-0 right-0 z-50">
          <div className="flex justify-between gap-3">
            <button
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
              className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一题
            </button>
            <button
              onClick={nextQuestion}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              {currentQuestion === questions.length - 1 ? '提交答案' : '下一题'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
