'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react'
import type { Subcategory, DiagnosticQuestion } from '@/lib/ai/types'

interface DiagnosticQuestionsFlowProps {
  companyId: string
  subcategory: Subcategory
  onComplete: () => void
  onBack: () => void
}

const SUBCATEGORY_NAMES: Record<Subcategory, string> = {
  SCALABILITY: 'Scalability',
  TECHNOLOGY: 'Technology',
  VENDOR: 'Vendor Agreements',
  RETENTION: 'Employee Retention',
}

export function DiagnosticQuestionsFlow({
  companyId,
  subcategory,
  onComplete,
  onBack,
}: DiagnosticQuestionsFlowProps) {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatingTasks, setGeneratingTasks] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/diagnostic/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            subcategory,
            initialAnswer: 'Needs improvement',
            initialScore: 50,
          }),
        })

        if (!response.ok) throw new Error('Failed to generate questions')

        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [companyId, subcategory])

  const handleSelectOption = (optionId: string) => {
    const question = questions[currentIndex]
    setAnswers(prev => ({ ...prev, [question.id]: optionId }))

    // Auto-advance after a brief delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
      }
    }, 300)
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      // Submit diagnostic responses
      const submitResponse = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          subcategory,
          responses: questions.map(q => ({
            questionId: q.id,
            selectedOptionId: answers[q.id],
          })),
        }),
      })

      if (!submitResponse.ok) throw new Error('Failed to submit responses')

      // Generate tasks
      setGeneratingTasks(true)
      const tasksResponse = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          subcategory,
        }),
      })

      if (!tasksResponse.ok) throw new Error('Failed to generate tasks')

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
      setGeneratingTasks(false)
    }
  }

  const allAnswered = questions.every(q => answers[q.id])
  const currentQuestion = questions[currentIndex]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Generating personalized questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={onBack}
          className="text-sm text-primary hover:text-primary/80"
        >
          Go back
        </button>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">
          {generatingTasks ? 'Creating your improvement tasks...' : 'Analyzing your responses...'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {SUBCATEGORY_NAMES[subcategory]} Diagnosis
          </h1>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + (answers[currentQuestion?.id] ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      {currentQuestion && (
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              {currentQuestion.questionText}
            </h2>
            {currentQuestion.contextText && (
              <p className="text-sm text-muted-foreground">
                {currentQuestion.contextText}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-background'
                  }`}
                >
                  <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>
                    {option.text}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            disabled={!answers[currentQuestion?.id]}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Tasks
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
