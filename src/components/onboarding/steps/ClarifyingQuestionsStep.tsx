'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { MessageCircleQuestion, Loader2 } from 'lucide-react'
import type { ClarifyingQuestion } from '@/lib/ai/types'
import styles from '@/components/onboarding/onboarding.module.css'

interface ClarifyingQuestionsStepProps {
  companyName: string
  businessDescription: string
  industry: string
  revenueRange: string
  onComplete: (answers: Record<string, string>, questions: ClarifyingQuestion[]) => void
}

export function ClarifyingQuestionsStep({
  companyName,
  businessDescription,
  industry,
  revenueRange,
  onComplete,
}: ClarifyingQuestionsStepProps) {
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch clarifying questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/profile/clarifying-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessDescription,
            industry,
            revenueRange,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate questions')
        }

        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [businessDescription, industry, revenueRange])

  // Auto-proceed if no questions needed (must be before early returns)
  useEffect(() => {
    if (!isLoading && questions.length === 0 && !error) {
      onComplete({}, [])
    }
  }, [isLoading, questions.length, error, onComplete])

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const handleOtherTextChange = (questionId: string, text: string) => {
    setOtherText((prev) => ({ ...prev, [questionId]: text }))
  }

  const allQuestionsAnswered = questions.every((q) => {
    const answer = answers[q.id]
    if (!answer) return false
    // If they selected "other" option and it allows other, check for text
    const selectedOption = q.options.find((o) => o.id === answer)
    if (selectedOption?.text.toLowerCase().includes('something else') && q.allowsOther) {
      return !!otherText[q.id]?.trim()
    }
    return true
  })

  const handleContinue = () => {
    // Merge answers with "other" text where applicable
    const finalAnswers: Record<string, string> = {}
    for (const q of questions) {
      const answer = answers[q.id]
      const selectedOption = q.options.find((o) => o.id === answer)
      if (selectedOption?.text.toLowerCase().includes('something else') && otherText[q.id]) {
        finalAnswers[q.id] = `other:${otherText[q.id]}`
      } else {
        finalAnswers[q.id] = answer
      }
    }
    onComplete(finalAnswers, questions)
  }

  if (isLoading) {
    return (
      <div className={styles.clarifyLoadingState}>
        <Loader2 className={styles.clarifyLoadingIcon} style={{ width: '2rem', height: '2rem', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p className={styles.clarifyLoadingText}>Analyzing your business...</p>
        <p className={styles.clarifyLoadingSubtext}>Generating personalized questions</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.clarifyErrorState}>
        <p className={styles.clarifyErrorText}>{error}</p>
        <button
          onClick={() => onComplete({}, [])}
          className={styles.clarifyErrorLink}
        >
          Continue anyway
        </button>
      </div>
    )
  }

  if (questions.length === 0 && !isLoading && !error) {
    return (
      <div className={styles.clarifyEmptyState}>
        <p className={styles.clarifyEmptyText}>Great! We have everything we need.</p>
      </div>
    )
  }

  return (
    <div className={styles.clarifyRoot}>
      <div className={styles.clarifyHeader}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.clarifyIconWrap}
        >
          <MessageCircleQuestion className={styles.clarifyIcon} style={{ width: '1.75rem', height: '1.75rem' }} />
        </motion.div>
        <h2 className={styles.clarifyTitle}>
          A few quick questions about {companyName}
        </h2>
        <p className={styles.clarifySubtitle}>
          This helps us create a personalized improvement plan.
        </p>
      </div>

      <div className={styles.clarifyQuestionList}>
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={styles.clarifyQuestion}
          >
            <p className={styles.clarifyQuestionLabel}>
              {index + 1}. {question.question}
            </p>
            <div className={styles.clarifyOptionList}>
              {question.options.map((option) => {
                const isSelected = answers[question.id] === option.id
                const isOther = option.text.toLowerCase().includes('something else')

                return (
                  <div key={option.id}>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(question.id, option.id)}
                      className={`${styles.clarifyOptionBtn} ${isSelected ? styles.clarifyOptionBtnSelected : ''}`}
                    >
                      <span className={styles.clarifyOptionInner}>
                        <span className={`${styles.clarifyRadio} ${isSelected ? styles.clarifyRadioSelected : ''}`}>
                          {isSelected && (
                            <span className={styles.clarifyRadioDot} />
                          )}
                        </span>
                        <span className={styles.clarifyOptionText}>{option.text}</span>
                      </span>
                    </button>

                    {/* Show text input if "other" is selected */}
                    {isSelected && isOther && question.allowsOther && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={styles.clarifyOtherInput}
                      >
                        <input
                          type="text"
                          value={otherText[question.id] || ''}
                          onChange={(e) =>
                            handleOtherTextChange(question.id, e.target.value)
                          }
                          placeholder="Please specify..."
                          className={styles.clarifyTextInput}
                        />
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className={styles.clarifyFooter}>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!allQuestionsAnswered}
          className={`${styles.clarifySubmitBtn} ${allQuestionsAnswered ? styles.clarifySubmitBtnActive : styles.clarifySubmitBtnDisabled}`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
