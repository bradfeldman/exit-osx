'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { DiagnosisHeader } from './DiagnosisHeader'
import { BRIRangeGauge } from './BRIRangeGauge'
import { CategoryPanel } from './CategoryPanel'
import { RiskDriversSection } from './RiskDriversSection'
import { DiagnosisLoading } from './DiagnosisLoading'
import { DiagnosisError } from './DiagnosisError'
import { DiagnosisActionBanner } from './DiagnosisActionBanner'
import { LowestConfidencePrompt } from './LowestConfidencePrompt'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { PostAssessmentPlaybooks } from '@/components/playbook/PostAssessmentPlaybooks'

interface CategoryData {
  category: string
  label: string
  score: number
  scoreDecimal: number
  dollarImpact: number | null
  weight: number
  isAssessed: boolean
  confidence: {
    dots: number
    label: string
    questionsAnswered: number
    questionsTotal: number
    lastUpdated: string | null
    daysSinceUpdate: number | null
    isStale: boolean
    hasUnansweredAiQuestions: boolean
  }
  isLowestConfidence: boolean
  financialContext?: {
    tier: string
    metric: { label: string; value: string; source: string } | null
    benchmark: { range: string; source: string } | null
    dollarContext: string | null
  } | null
}

interface RiskDriver {
  id: string
  name: string
  category: string
  categoryLabel: string
  dollarImpact: number
  currentScore: number
  optionPosition: number
  totalOptions: number
  questionText: string
  buyerLogic: string | null
  hasLinkedTask: boolean
  linkedTaskId: string | null
  linkedTaskTitle: string | null
  linkedTaskStatus: string | null
  financialContext?: {
    ebitda: number
    source: string
    benchmarkMultiple: string | null
  } | null
}

interface DiagnosisData {
  briScore: number | null
  briScoreDecimal: number
  isEstimated: boolean
  categories: CategoryData[]
  riskDrivers: RiskDriver[]
  assessmentId: string | null
  hasAssessment: boolean
  lastAssessmentDate: string | null
  questionCounts: Record<string, { total: number; answered: number; unanswered: number }>
}

export function DiagnosisPage() {
  const { selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  const { progressionData } = useProgression()
  const hasFullAssessment = progressionData?.hasFullAssessment ?? false
  const assessedCategoryCount = progressionData?.assessedCategoryCount ?? 0
  const assessedCategories = progressionData?.assessedCategories ?? []
  const isFreeUser = planTier === 'foundation'
  const searchParams = useSearchParams()
  const router = useRouter()
  const [data, setData] = useState<DiagnosisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [hasInitializedExpand, setHasInitializedExpand] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [sharpenActive, setSharpenActive] = useState(false)
  const sharpenConsumedRef = useRef(false)
  const [cadenceNextDates, setCadenceNextDates] = useState<Record<string, string | null>>({})
  const [topPlaybooks, setTopPlaybooks] = useState<Array<{
    playbook: import('../../../prisma/seed-data/playbook-definitions').PlaybookDefinition
    relevanceScore: number
    estimatedImpactLow: number
    estimatedImpactHigh: number
  }>>([])
  const [showPlaybooks, setShowPlaybooks] = useState(true)

  // Fetch playbook recommendations when assessment exists
  useEffect(() => {
    if (!selectedCompanyId || !hasFullAssessment) return
    fetch(`/api/companies/${selectedCompanyId}/playbook-recommendations`)
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        if (result?.recommendations) {
          setTopPlaybooks(
            result.recommendations
              .filter((r: { isRecommended: boolean }) => r.isRecommended)
              .slice(0, 3)
          )
        }
      })
      .catch(() => {})
  }, [selectedCompanyId, hasFullAssessment])

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/diagnosis`)
      if (!response.ok) throw new Error('Failed to fetch diagnosis data')
      const json = await response.json()

      // If no assessment exists yet (e.g., user only did quick-scan onboarding),
      // create one so the inline assessment buttons are enabled
      if (!json.assessmentId) {
        try {
          const createRes = await fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: selectedCompanyId, assessmentType: 'INITIAL' }),
          })
          if (createRes.ok) {
            const { assessment } = await createRes.json()
            json.assessmentId = assessment.id
          } else {
            const errBody = await createRes.json().catch(() => ({}))
            console.error('[Diagnosis] Assessment creation failed:', createRes.status, errBody)
          }
        } catch (createErr) {
          console.error('[Diagnosis] Assessment creation error:', createErr)
        }
      }

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  // Fetch cadence data in parallel with diagnosis data (for per-category next dates)
  const fetchCadence = useCallback(async () => {
    if (!selectedCompanyId) return
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/assessment-cadence`)
      if (res.ok) {
        const cadenceData = await res.json()
        // Build next-date map for per-category display
        const nextDates: Record<string, string | null> = {}
        for (const cat of cadenceData.categories ?? []) {
          nextDates[cat.categoryId] = cat.nextPromptDate
        }
        setCadenceNextDates(nextDates)
      }
    } catch {
      // Non-critical — cadence UI is supplementary
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
    fetchCadence()
  }, [fetchData, fetchCadence])

  // Refs for each category card to enable scroll-into-view
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Callback to expand a specific category and scroll it into view
  const handleExpandCategory = useCallback((category: string) => {
    setExpandedCategory(category)
    // Scroll the category card into view after a brief delay for expansion animation
    setTimeout(() => {
      categoryRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // Callback for when an inline assessment completes - refetch all data
  const handleAssessmentComplete = useCallback(() => {
    setExpandedCategory(null)
    fetchData()
  }, [fetchData])

  // Auto-expand category from URL query param (e.g., /dashboard/diagnosis?expand=FINANCIAL)
  useEffect(() => {
    if (!hasInitializedExpand && data && !isLoading) {
      const expandParam = searchParams.get('expand')
      if (expandParam) {
        // Validate it's a real category
        const validCategory = data.categories.find(c => c.category === expandParam)
        if (validCategory) {
          handleExpandCategory(expandParam)
        }
      }
      setHasInitializedExpand(true)
    }
  }, [searchParams, data, isLoading, hasInitializedExpand, handleExpandCategory])

  // Auto-trigger sharpen from ?sharpen=true query param (e.g., from Actions page)
  useEffect(() => {
    if (!sharpenConsumedRef.current && searchParams.get('sharpen') === 'true' && !isLoading) {
      sharpenConsumedRef.current = true
      setSharpenActive(true)
      // Clean the URL param
      router.replace('/dashboard/diagnosis', { scroll: false })
    }
  }, [searchParams, isLoading, router])

  // Show "Re-Assess" banner when all questions are answered and no unanswered AI questions exist
  const allQuestionsAnswered = useMemo(() => {
    if (!data || data.categories.length === 0) return false
    return data.categories.every(
      cat => cat.confidence.questionsAnswered === cat.confidence.questionsTotal
        && !cat.confidence.hasUnansweredAiQuestions
    )
  }, [data])

  if (isLoading) return <DiagnosisLoading />
  if (error || !data) return <DiagnosisError onRetry={fetchData} />

  return (
    <div className="max-w-5xl mx-auto sm:px-2 py-2 sm:py-8">
      <AnimatedStagger className="space-y-4 sm:space-y-8" staggerDelay={0.1}>
        {/* Page Header */}
        <AnimatedItem>
          <DiagnosisHeader
            briScore={data.briScore}
            isEstimated={data.isEstimated}
          />
        </AnimatedItem>

        {/* BRI Range Gauge */}
        <AnimatedItem>
          <BRIRangeGauge
            briScore={data.briScore}
            isEstimated={data.isEstimated}
          />
        </AnimatedItem>

        {/* Smart Action Banner — replaces CadencePromptBanner + SharpenDiagnosisBanner */}
        <AnimatedItem>
          <DiagnosisActionBanner
            assessedCategoryCount={assessedCategoryCount}
            assessedCategories={assessedCategories}
            hasFullAssessment={hasFullAssessment}
            allQuestionsAnswered={allQuestionsAnswered}
            lastAssessmentDate={data.lastAssessmentDate}
            companyId={selectedCompanyId}
            isFreeUser={isFreeUser}
            onExpandCategory={handleExpandCategory}
            onUpgrade={() => setUpgradeModalOpen(true)}
            onReassessComplete={() => {
              setSharpenActive(false)
              fetchData()
            }}
            autoGenerate={sharpenActive}
          />
        </AnimatedItem>

        {/* Category Grid */}
        <AnimatedItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {data.categories.map(cat => {
              // Free users who have completed both free categories (FINANCIAL, OPERATIONAL)
              // should see an upgrade prompt when clicking the remaining 4 locked categories
              const freeCats = ['FINANCIAL', 'OPERATIONAL']
              const allFreeDone = isFreeUser && freeCats.every(c => assessedCategories.includes(c))
              const isLockedForFree = allFreeDone && !freeCats.includes(cat.category)

              return (
                <div key={cat.category} ref={el => { categoryRefs.current[cat.category] = el }}>
                  <CategoryPanel
                    category={cat.category}
                    label={cat.label}
                    score={cat.score}
                    dollarImpact={cat.dollarImpact}
                    isAssessed={cat.isAssessed}
                    confidence={cat.confidence}
                    isLowestConfidence={cat.isLowestConfidence}
                    assessmentId={data.assessmentId}
                    companyId={selectedCompanyId}
                    onAssessmentComplete={handleAssessmentComplete}
                    isExpanded={expandedCategory === cat.category}
                    onExpand={() => {
                      if (isLockedForFree) {
                        setUpgradeModalOpen(true)
                      } else {
                        handleExpandCategory(cat.category)
                      }
                    }}
                    onCollapse={() => setExpandedCategory(null)}
                    nextPromptDate={cadenceNextDates[cat.category] ?? null}
                    financialContext={cat.financialContext}
                    planTier={planTier}
                  />
                </div>
              )
            })}
          </div>
        </AnimatedItem>

        {/* Value at Risk */}
        <AnimatedItem>
          <RiskDriversSection
            riskDrivers={data.riskDrivers}
            hasAssessment={data.hasAssessment}
            assessedCategoryCount={assessedCategoryCount}
            isFreeUser={isFreeUser}
            onUpgrade={() => setUpgradeModalOpen(true)}
            onExpandCategory={handleExpandCategory}
          />
        </AnimatedItem>

        {/* Top Playbook Recommendations — shown after assessment completion */}
        {showPlaybooks && topPlaybooks.length > 0 && (
          <AnimatedItem>
            <PostAssessmentPlaybooks
              playbooks={topPlaybooks}
              planTier={planTier}
              onDismiss={() => setShowPlaybooks(false)}
            />
          </AnimatedItem>
        )}

        {/* Lowest Confidence Prompt — shown at bottom when one category needs more answers */}
        <AnimatedItem>
          <LowestConfidencePrompt
            categories={data.categories}
            onExpandCategory={handleExpandCategory}
          />
        </AnimatedItem>
      </AnimatedStagger>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature="risk-assessment"
        featureDisplayName="Risk Diagnostic"
      />
    </div>
  )
}
