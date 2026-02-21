'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/assessments/assessments.module.css'

interface QuestionOption {
  id: string
  text: string
  score: number
  displayOrder: number
}

interface Question {
  id: string
  text: string
  helpText: string | null
  briCategory: string
  options: QuestionOption[]
}

interface Assessment {
  id: string
}

const CATEGORY_LABELS: Record<string, { label: string }> = {
  FINANCIAL: { label: 'Financial Health' },
  REVENUE_GROWTH: { label: 'Revenue Quality' },
  RECURRING_REVENUE: { label: 'Recurring Revenue' },
  CUSTOMER_CONCENTRATION: { label: 'Customer Concentration' },
  OWNER_DEPENDENCY: { label: 'Owner Dependence' },
  OPERATIONAL: { label: 'Operational Maturity' },
  LEGAL_TAX: { label: 'Legal & Compliance' },
  LEGAL_COMPLIANCE: { label: 'Legal & Compliance' },
  MARKET: { label: 'Market Position' },
  PERSONAL: { label: 'Personal Readiness' },
  TRANSFERABILITY: { label: 'Transferability' },
}

// Maps option index → left-border color class
const HINT_OPTION_CLASSES = [
  styles.answerOptionRed,
  styles.answerOptionOrange,
  styles.answerOptionBlue,
  styles.answerOptionGreen,
]

// Maps option index → hint label color class
const HINT_LABEL_CLASSES = [
  styles.hintRed,
  styles.hintOrange,
  styles.hintBlue,
  styles.hintGreen,
]

// Human-readable hint labels for each answer position (lowest → highest score)
const HINT_LABELS = [
  'High risk signal',
  'Moderate concern',
  'Good position',
  'Excellent signal',
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function TakeAssessmentPage() {
  const { selectedCompanyId } = useCompany()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    async function init() {
      try {
        // Create or get existing assessment
        const assessRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: selectedCompanyId }),
        })
        if (!assessRes.ok) return

        const assessData = await assessRes.json()
        if (assessData.isCompleted) {
          router.push('/dashboard/assessments')
          return
        }

        if (!cancelled) setAssessment(assessData.assessment)

        // Fetch questions
        const qRes = await fetch(`/api/questions?companyId=${selectedCompanyId}`)
        if (!qRes.ok) return
        const qData = await qRes.json()

        if (!cancelled) {
          setQuestions(qData.questions || [])

          // Restore existing responses so the user can resume mid-assessment
          if (assessData.isExisting && assessData.assessment?.id) {
            const respRes = await fetch(`/api/assessments/${assessData.assessment.id}/responses`)
            if (respRes.ok) {
              const respData = await respRes.json()
              const existing: Record<string, string> = {}
              let lastIndex = 0
              for (const resp of respData.responses || []) {
                existing[resp.questionId] = resp.selectedOptionId
                const qIndex = (qData.questions || []).findIndex((q: Question) => q.id === resp.questionId)
                if (qIndex > lastIndex) lastIndex = qIndex
              }
              if (!cancelled) {
                setAnswers(existing)
                setCurrentIndex(Math.min(lastIndex + 1, (qData.questions || []).length - 1))
              }
            }
          }
        }
      } catch {
        // Initialization error — stay on loading state and show empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [selectedCompanyId, router])

  const saveResponse = useCallback(async (questionId: string, optionId: string) => {
    if (!assessment) return
    try {
      await fetch(`/api/assessments/${assessment.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedOptionId: optionId }),
      })
    } catch {
      // Silent — auto-saves best-effort
    }
  }, [assessment])

  const handleSelect = useCallback((optionId: string) => {
    const question = questions[currentIndex]
    if (!question) return
    setAnswers(prev => ({ ...prev, [question.id]: optionId }))
    saveResponse(question.id, optionId)
  }, [currentIndex, questions, saveResponse])

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else if (assessment) {
      setSubmitting(true)
      try {
        await fetch(`/api/assessments/${assessment.id}/complete`, { method: 'POST' })
        router.push('/dashboard/assessments')
      } catch {
        setSubmitting(false)
      }
    }
  }, [currentIndex, questions.length, assessment, router])

  const handleBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
  }, [currentIndex])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No questions available.</p>
        <Link href="/dashboard/assessments" className={styles.sectionLink} style={{ marginTop: '8px', display: 'inline-block' }}>
          Back to Assessments
        </Link>
      </div>
    )
  }

  const question = questions[currentIndex]
  const categoryLabel = CATEGORY_LABELS[question.briCategory]?.label || question.briCategory
  const progressPct = ((currentIndex + 1) / questions.length) * 100
  const selectedOptionId = answers[question.id]
  const isLastQuestion = currentIndex === questions.length - 1
  const minutesLeft = Math.max(1, Math.ceil((questions.length - currentIndex) * 0.5))

  // Build category sidebar data — groups questions by briCategory in order
  const categories: { key: string; label: string; questions: Question[]; answeredCount: number }[] = []
  const categoryMap: Record<string, number> = {}
  for (const q of questions) {
    if (categoryMap[q.briCategory] === undefined) {
      categoryMap[q.briCategory] = categories.length
      categories.push({
        key: q.briCategory,
        label: CATEGORY_LABELS[q.briCategory]?.label || q.briCategory,
        questions: [],
        answeredCount: 0,
      })
    }
    const cat = categories[categoryMap[q.briCategory]]
    cat.questions.push(q)
    if (answers[q.id]) cat.answeredCount++
  }

  const currentCategoryKey = question.briCategory

  return (
    <>
      <TrackPageView page="/dashboard/assessments/take" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/assessments">Assessments</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Business Readiness Assessment</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Business Readiness Assessment</h1>
          <p>Complete all dimensions for your full BRI score</p>
        </div>
        <div>
          <Link href="/dashboard/assessments" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Exit Assessment
          </Link>
        </div>
      </div>

      {/* Step Progress Indicator */}
      <div className={styles.stepIndicator}>
        <div className={styles.stepLabel}>Question {currentIndex + 1} of {questions.length}</div>
        <div className={styles.stepProgressTrack}>
          <div className={styles.stepProgressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.stepTime}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px', display: 'inline', verticalAlign: '-2px', marginRight: '3px' }}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          ~{minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'} left
        </div>
      </div>

      {/* Two-column layout: category sidebar + question card */}
      <div className={styles.assessmentLayout}>

        {/* Left: Category Progress Sidebar */}
        <div className={styles.categorySidebar}>
          <div className={styles.categorySidebarTitle}>Assessment Progress</div>
          {categories.map(cat => {
            const isComplete = cat.answeredCount === cat.questions.length
            const isActive = cat.key === currentCategoryKey
            const isUpcoming = !isActive && !isComplete && cat.answeredCount === 0

            return (
              <div
                key={cat.key}
                className={[
                  styles.categoryItem,
                  isActive ? styles.categoryItemActive : '',
                  isUpcoming ? styles.categoryItemUpcoming : '',
                ].join(' ')}
              >
                <div className={[
                  styles.categoryIcon,
                  isComplete ? styles.categoryIconComplete : isActive ? styles.categoryIconActive : styles.categoryIconUpcoming,
                ].join(' ')}>
                  {isComplete ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className={styles.categoryName}>{cat.label}</div>
                  <div className={styles.categoryProgress}>
                    {isComplete
                      ? `${cat.questions.length} of ${cat.questions.length} complete`
                      : isActive
                        ? `${cat.answeredCount} of ${cat.questions.length} in progress`
                        : `0 of ${cat.questions.length} upcoming`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Question Card + Contextual Note */}
        <div>
          <div className={styles.questionCard}>

            {/* Category Tag */}
            <div className={styles.questionCategoryTag}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              {categoryLabel}
            </div>

            {/* Question text */}
            <div className={styles.questionText}>{question.text}</div>
            {question.helpText && (
              <div className={styles.questionHelp}>{question.helpText}</div>
            )}

            {/* Answer Options */}
            <div className={styles.answerOptions}>
              {question.options.map((option, i) => {
                const isSelected = selectedOptionId === option.id
                const hintIndex = Math.min(i, HINT_OPTION_CLASSES.length - 1)

                return (
                  <div
                    key={option.id}
                    className={[
                      styles.answerOption,
                      HINT_OPTION_CLASSES[hintIndex],
                      isSelected ? styles.answerOptionSelected : '',
                    ].join(' ')}
                    onClick={() => handleSelect(option.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelect(option.id) }}
                    aria-pressed={isSelected}
                  >
                    <div className={styles.answerLetter}>{OPTION_LETTERS[i] ?? String(i + 1)}</div>
                    <div>
                      <div className={styles.answerMainText}>{option.text}</div>
                      <div className={`${styles.answerHintLabel} ${HINT_LABEL_CLASSES[hintIndex]}`}>
                        {/* Small icon matching mocksite hint labels */}
                        {hintIndex === 0 && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '10px', height: '10px' }}>
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
                          </svg>
                        )}
                        {hintIndex === 1 && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '10px', height: '10px' }}>
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                        {(hintIndex === 2 || hintIndex === 3) && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '10px', height: '10px' }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {HINT_LABELS[hintIndex]}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer: Save & Exit / Back / Next */}
            <div className={styles.questionFooter}>
              <div className={styles.questionFooterLeft}>
                <Link href="/dashboard/assessments" className={styles.saveExitLink}>
                  Save &amp; Exit
                </Link>
                <span className={styles.questionNumberBadge}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <div className={styles.questionFooterRight}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={handleBack}
                  disabled={currentIndex === 0}
                  style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
                  aria-label="Previous question"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleNext}
                  disabled={!selectedOptionId || submitting}
                  style={{ opacity: !selectedOptionId || submitting ? 0.5 : 1 }}
                  aria-label={isLastQuestion ? 'Complete assessment' : 'Next question'}
                >
                  {submitting ? 'Completing...' : isLastQuestion ? 'Complete' : 'Next'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Contextual "Why this matters" note */}
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '1px', color: 'var(--accent)' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                Why this matters
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {question.helpText
                  ? `This question feeds directly into your BRI ${categoryLabel} sub-score and impacts how buyers evaluate your business during due diligence.`
                  : `Your answer to this question contributes to the ${categoryLabel} dimension of your Business Readiness Index — a key factor buyers use to assess acquisition risk.`}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
