'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  BRI_CATEGORY_ORDER,
  BRI_CATEGORY_LABELS,
  type BRICategory,
} from '@/lib/constants/bri-categories'

type BannerState =
  | 'BASELINE_NEEDED'
  | 'PARTIAL_PAID'
  | 'COOLDOWN'
  | 'REASSESS_AVAILABLE'
  | 'GENERATING'
  | 'SUCCESS'
  | 'ERROR'

interface DiagnosisActionBannerProps {
  assessedCategoryCount: number
  assessedCategories: string[]
  hasFullAssessment: boolean
  allQuestionsAnswered: boolean
  lastAssessmentDate: string | null
  companyId: string | null
  onExpandCategory: (category: string) => void
  onReassessComplete: () => void
  autoGenerate?: boolean
}

const COOLDOWN_DAYS = 7

function getNextUnassessedCategory(assessedCategories: string[]): { key: string; label: string } | null {
  for (const cat of BRI_CATEGORY_ORDER) {
    if (!assessedCategories.includes(cat)) {
      return { key: cat, label: BRI_CATEGORY_LABELS[cat] }
    }
  }
  return null
}

function getDaysUntilReassess(lastAssessmentDate: string | null): number {
  if (!lastAssessmentDate) return 0
  const last = new Date(lastAssessmentDate)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(COOLDOWN_DAYS - diffDays))
}

export function DiagnosisActionBanner({
  assessedCategoryCount,
  assessedCategories,
  hasFullAssessment,
  allQuestionsAnswered,
  lastAssessmentDate,
  companyId,
  onExpandCategory,
  onReassessComplete,
  autoGenerate = false,
}: DiagnosisActionBannerProps) {
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>(
    autoGenerate ? 'generating' : 'idle'
  )
  const [questionCount, setQuestionCount] = useState(0)
  const hasAutoFired = useRef(false)

  const daysRemaining = useMemo(
    () => getDaysUntilReassess(lastAssessmentDate),
    [lastAssessmentDate]
  )

  // Determine which logical state we're in
  const bannerState: BannerState = useMemo(() => {
    if (generationState === 'generating') return 'GENERATING'
    if (generationState === 'success') return 'SUCCESS'
    if (generationState === 'error') return 'ERROR'

    if (assessedCategoryCount === 0) return 'BASELINE_NEEDED'
    if (!hasFullAssessment) return 'PARTIAL_PAID'
    if (daysRemaining > 0) return 'COOLDOWN'
    return 'REASSESS_AVAILABLE'
  }, [assessedCategoryCount, hasFullAssessment, daysRemaining, generationState])

  const nextCategory = useMemo(
    () => getNextUnassessedCategory(assessedCategories),
    [assessedCategories]
  )

  const runGeneration = async () => {
    if (!companyId) return
    setGenerationState('generating')
    try {
      const res = await fetch(`/api/companies/${companyId}/dossier/generate-questions`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.questionCount > 0) {
          setQuestionCount(data.questionCount)
          setGenerationState('success')
          setTimeout(() => onReassessComplete(), 2000)
        } else {
          setGenerationState('error')
        }
      } else {
        setGenerationState('error')
      }
    } catch {
      setGenerationState('error')
    }
  }

  // Auto-generate on mount when triggered from Actions page
  useEffect(() => {
    if (autoGenerate && !hasAutoFired.current && hasFullAssessment) {
      hasAutoFired.current = true
      runGeneration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, hasFullAssessment])

  // --- GENERATING state ---
  if (bannerState === 'GENERATING') {
    return (
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Analyzing your business for the most impactful questions...
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Exit OSx is reviewing your activity and completed actions to determine what to assess next.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- SUCCESS state ---
  if (bannerState === 'SUCCESS') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {questionCount} new questions added
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review your updated categories to refine your scores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- ERROR state ---
  if (bannerState === 'ERROR') {
    return (
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Couldn&apos;t generate new questions
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Something went wrong. Try again in a moment.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runGeneration}
            className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // --- BASELINE_NEEDED: No assessments completed ---
  if (bannerState === 'BASELINE_NEEDED') {
    return (
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-orange-50/60 to-amber-50/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Get Your Custom Action Plan
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a baseline across 6 categories to unlock personalized action items that close gaps and increase your company&apos;s value.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onExpandCategory('FINANCIAL')}
            className="shrink-0 gap-1"
          >
            Start with Financial Health
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // --- PARTIAL_PAID: 1-5 categories done ---
  if (bannerState === 'PARTIAL_PAID') {
    const remaining = 6 - assessedCategoryCount
    return (
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-800">
                {assessedCategoryCount} of 6 categories assessed
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {remaining === 1
                  ? 'One more category to complete your full diagnosis and unlock your personalized action plan.'
                  : `${remaining} more categories to complete your full diagnosis and unlock your personalized action plan.`}
              </p>
              {/* Progress dots */}
              <div className="flex gap-1.5 mt-2.5">
                {BRI_CATEGORY_ORDER.map((cat) => {
                  const isAssessed = assessedCategories.includes(cat)
                  return (
                    <div
                      key={cat}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        isAssessed ? 'bg-blue-500' : 'bg-blue-200/60'
                      )}
                      title={BRI_CATEGORY_LABELS[cat]}
                    />
                  )
                })}
              </div>
            </div>
          </div>
          {nextCategory && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExpandCategory(nextCategory.key)}
              className="shrink-0 gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Continue: {nextCategory.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // --- COOLDOWN: All 6 done, within 7 days ---
  if (bannerState === 'COOLDOWN') {
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-zinc-50/80 to-slate-50/50 p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Diagnosis Up to Date
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Exit OSx is analyzing your business activity to determine the most impactful re-assessment questions. Focus on completing your action items in the meantime.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Next re-assessment available in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- REASSESS_AVAILABLE: All 6 done, cooldown elapsed ---
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Time to Re-Assess Your Readiness
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {allQuestionsAnswered
                ? 'Unlock follow-up questions to refine your scores and surface hidden risks.'
                : 'Your business may have changed since your last assessment. Re-assess to keep your action items current.'}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={runGeneration}
          className="shrink-0 gap-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Start Re-Assessment
        </Button>
      </div>
    </div>
  )
}
