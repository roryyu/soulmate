'use client'

/**
 * 音符答题弹层：点击散落音符后弹出，选择一个选项即为该音符「配音」。
 * 选项的五行权重与飞行动效由上层处理。
 */
import { useEffect, useState } from 'react'
import type { Question, QuestionOption } from '../lib/types'

interface Props {
  open: boolean
  question: Question | null
  onAnswer: (opt: QuestionOption, el: HTMLElement) => void
  onLater: () => void
}

export default function QuizModal({ open, question, onAnswer, onLater }: Props) {
  const [locked, setLocked] = useState(false)

  // 每次换题解锁
  useEffect(() => { setLocked(false) }, [question])

  if (!open || !question) {
    return <div id="quiz-modal" className="hidden" />
  }

  return (
    <div id="quiz-modal">
      <div className="quiz-card">
        <span className="q-index">✦ 音符的心声</span>
        <p className="q-text" id="q-text">{question.t}</p>
        <div className="q-opts" id="q-opts">
          {question.opts.map((o) => (
            <div
              key={o.l}
              className="q-opt"
              style={locked ? { pointerEvents: 'none' } : undefined}
              onClick={(e) => { setLocked(true); onAnswer(o, e.currentTarget) }}
            >
              <span>{o.l}</span>
            </div>
          ))}
        </div>
        <button className="ghost-btn q-later" id="btn-q-later" onClick={onLater}>稍后再来</button>
      </div>
    </div>
  )
}
