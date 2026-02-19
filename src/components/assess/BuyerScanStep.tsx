'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { ArrowLeft } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type AnswerValue = 'yes' | 'mostly' | 'not_yet' | 'no'

const ANSWER_OPTIONS: { value: AnswerValue; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { value: 'yes', label: 'Yes', color: 'var(--green)', bgColor: 'var(--green-light)', borderColor: 'var(--green)' },
  { value: 'mostly', label: 'Mostly', color: 'var(--primary)', bgColor: 'var(--accent-light)', borderColor: 'var(--primary)' },
  { value: 'not_yet', label: 'Not yet', color: 'var(--orange)', bgColor: 'var(--orange-light)', borderColor: 'var(--orange)' },
  { value: 'no', label: 'No', color: 'var(--red)', bgColor: 'var(--red-light)', borderColor: 'var(--red)' },
]

const QUICK_SCAN_QUESTIONS = [
  {
    id: 'financial-1',
    category: 'FINANCIAL',
    categoryLabel: 'Financial',
    question: 'Would a buyer receive third-party-verified financials without needing to ask?',
    invertScoring: false,
  },
  {
    id: 'financial-2',
    category: 'FINANCIAL',
    categoryLabel: 'Financial',
    question: 'Does any single customer account for more than 10% of your revenue?',
    invertScoring: true, // Yes = risk
  },
  {
    id: 'transferability-1',
    category: 'TRANSFERABILITY',
    categoryLabel: 'Transferability',
    question: 'Could you show a buyer the business has run profitably without you for 30+ days?',
    invertScoring: false,
  },
  {
    id: 'transferability-2',
    category: 'TRANSFERABILITY',
    categoryLabel: 'Transferability',
    question: 'Would a buyer meet someone who could step into your role within 90 days?',
    invertScoring: false,
  },
  {
    id: 'operational-1',
    category: 'OPERATIONAL',
    categoryLabel: 'Operations',
    question: 'Could a new hire learn your core operations from written documentation alone?',
    invertScoring: false,
  },
  {
    id: 'legal-1',
    category: 'LEGAL_TAX',
    categoryLabel: 'Legal',
    question: 'Are all key customer and vendor relationships governed by signed contracts?',
    invertScoring: false,
  },
  {
    id: 'market-1',
    category: 'MARKET',
    categoryLabel: 'Market',
    question: 'Is more than half your revenue recurring or contracted for 12+ months?',
    invertScoring: false,
  },
  {
    id: 'personal-1',
    category: 'PERSONAL',
    categoryLabel: 'Personal',
    question: 'If a buyer asked, could you credibly commit to a completed exit within 6 months?',
    invertScoring: false,
  },
]

// Scoring: each question worth 12.5 pts
function scoreAnswer(answer: AnswerValue, inverted: boolean): number {
  const scores: Record<AnswerValue, number> = {
    yes: 12.5,
    mostly: 8.75,
    not_yet: 3.75,
    no: 0,
  }
  const invertedScores: Record<AnswerValue, number> = {
    yes: 0,
    mostly: 3.75,
    not_yet: 8.75,
    no: 12.5,
  }
  return inverted ? invertedScores[answer] : scores[answer]
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export interface BuyerScanData {
  answers: Record<string, AnswerValue | boolean>
  riskCount: number
  briScore: number
}

interface BuyerScanStepProps {
  initialData: BuyerScanData | null
  onComplete: (data: BuyerScanData) => void
  onBack: () => void
  onProgress?: (questionIndex: number) => void
}

export function BuyerScanStep({ initialData, onComplete, onBack, onProgress }: BuyerScanStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => {
    // Convert legacy boolean answers to 4-option format
    if (initialData?.answers) {
      const converted: Record<string, AnswerValue> = {}
      for (const [k, v] of Object.entries(initialData.answers)) {
        if (typeof v === 'boolean') {
          converted[k] = v ? 'yes' : 'no'
        } else if (typeof v === 'string') {
          converted[k] = v as AnswerValue
        }
      }
      return converted
    }
    return {}
  })
  const [isAdvancing, setIsAdvancing] = useState(false)

  const currentQuestion = QUICK_SCAN_QUESTIONS[currentIndex]
  const answeredCount = Object.keys(answers).length
  const isLastQuestion = currentIndex === QUICK_SCAN_QUESTIONS.length - 1
  const allAnswered = answeredCount === QUICK_SCAN_QUESTIONS.length

  // Report progress to parent
  useEffect(() => {
    onProgress?.(answeredCount)
  }, [answeredCount, onProgress])

  // Time remaining estimate
  const questionsLeft = QUICK_SCAN_QUESTIONS.length - answeredCount
  const minutesLeft = Math.max(1, Math.ceil(questionsLeft * 0.3))

  const handleAnswer = useCallback((value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))
    setIsAdvancing(true)

    if (isLastQuestion) {
      // Last question — don't auto-advance, show "See My Results" button
      setIsAdvancing(false)
      return
    }

    // Auto-advance after 400ms
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, QUICK_SCAN_QUESTIONS.length - 1))
      setIsAdvancing(false)
    }, 400)
  }, [currentIndex, currentQuestion.id, isLastQuestion])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else {
      onBack()
    }
  }, [currentIndex, onBack])

  const handleComplete = useCallback(() => {
    let totalScore = 0
    let riskCount = 0

    QUICK_SCAN_QUESTIONS.forEach(q => {
      const answer = answers[q.id]
      if (answer) {
        const score = scoreAnswer(answer, q.invertScoring)
        totalScore += score
        // Risk = scored less than 70% of possible points
        if (score < 8.75) riskCount++
      }
    })

    const briScore = Math.max(35, Math.round(totalScore))

    onComplete({ answers, riskCount, briScore })
  }, [answers, onComplete])

  return (
    <div className="space-y-5">
      {/* Eyebrow */}
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.8px]"
        style={{ color: 'var(--primary)' }}
      >
        Buyer Confidence Scan
      </div>

      {/* Sub-header with counter and time */}
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Question {currentIndex + 1} of {QUICK_SCAN_QUESTIONS.length}
        </span>
        <span
          className="text-[13px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          ~{minutesLeft} min left
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Category badge */}
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-4"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--primary)',
            }}
          >
            {currentQuestion.categoryLabel}
          </span>

          {/* Question text */}
          <h3
            className="text-xl sm:text-[20px] font-semibold leading-[1.35] mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            {currentQuestion.question}
          </h3>

          {/* 4-option answer scale */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            role="radiogroup"
            aria-label={currentQuestion.question}
          >
            {ANSWER_OPTIONS.map((opt) => {
              const selected = answers[currentQuestion.id] === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={isAdvancing}
                  onClick={() => handleAnswer(opt.value)}
                  className="h-12 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: selected ? opt.bgColor : 'var(--surface)',
                    border: selected ? `2px solid ${opt.borderColor}` : '1px solid var(--border)',
                    color: selected ? opt.color : 'var(--text-primary)',
                    transform: selected ? 'scale(1.02)' : 'scale(1)',
                    minWidth: '44px',
                    minHeight: '44px',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Navigation within scan */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            <div />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* See My Results button (only on last question after answering) */}
      {isLastQuestion && allAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            onClick={handleComplete}
            className="w-full h-12 rounded-lg text-base font-medium transition-all flex items-center justify-center"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            See My Results
          </button>
        </motion.div>
      )}
    </div>
  )
}
