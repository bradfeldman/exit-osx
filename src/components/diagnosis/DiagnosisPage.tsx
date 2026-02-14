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
import { SharpenDiagnosisBanner } from './SharpenDiagnosisBanner'
import { CadencePromptBanner } from './CadencePromptBanner'
import { LowestConfidencePrompt } from './LowestConfidencePrompt'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'

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
  const [cadencePrompt, setCadencePrompt] = useState<{
    categoryId: string
    categoryLabel: string
    reason: string
    urgency: 'low' | 'medium' | 'high'
  } | null>(null)
  const [cadenceNextDates, setCadenceNextDates] = useState<Record<string, string | null>>({})

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
        const createRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: selectedCompanyId, assessmentType: 'INITIAL' }),
        })
        if (createRes.ok) {
          const { assessment } = await createRes.json()
          json.assessmentId = assessment.id
        }
      }

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  // Fetch cadence data in parallel with diagnosis data
  const fetchCadence = useCallback(async () => {
    if (!selectedCompanyId) return
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/assessment-cadence`)
      if (res.ok) {
        const cadenceData = await res.json()
        if (cadenceData.topPrompt) {
          setCadencePrompt(cadenceData.topPrompt)
        } else {
          setCadencePrompt(null)
        }
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

  // Auto-expand category from URL query param (e.g., /dashboard/diagnosis?expand=FINANCIAL)
  useEffect(() => {
    if (!hasInitializedExpand && data && !isLoading) {
      const expandParam = searchParams.get('expand')
      if (expandParam) {
        // Validate it's a real category
        const validCategory = data.categories.find(c => c.category === expandParam)
        if (validCategory) {
          setExpandedCategory(expandParam)
        }
      }
      setHasInitializedExpand(true)
    }
  }, [searchParams, data, isLoading, hasInitializedExpand])

  // Auto-trigger sharpen from ?sharpen=true query param (e.g., from Actions page)
  useEffect(() => {
    if (!sharpenConsumedRef.current && searchParams.get('sharpen') === 'true' && !isLoading) {
      sharpenConsumedRef.current = true
      setSharpenActive(true)
      // Clean the URL param
      router.replace('/dashboard/diagnosis', { scroll: false })
    }
  }, [searchParams, isLoading, router])

  // Callback for when an inline assessment completes - refetch all data
  const handleAssessmentComplete = useCallback(() => {
    setExpandedCategory(null)
    fetchData()
  }, [fetchData])

  // Callback to expand a specific category (used by risk driver "Review & Update" buttons)
  const handleExpandCategory = useCallback((category: string) => {
    setExpandedCategory(category)
  }, [])

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
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnimatedStagger className="space-y-8" staggerDelay={0.1}>
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

        {/* Cadence Prompt Banner — shown when cadence rules say it's time to re-assess */}
        {cadencePrompt && selectedCompanyId && (
          <AnimatedItem>
            <CadencePromptBanner
              prompt={cadencePrompt}
              companyId={selectedCompanyId}
              onExpand={(categoryId) => {
                setExpandedCategory(categoryId)
                setCadencePrompt(null)
              }}
              onDismiss={() => setCadencePrompt(null)}
            />
          </AnimatedItem>
        )}

        {/* Re-Assess Banner (only after full 6-category baseline) */}
        {hasFullAssessment && (allQuestionsAnswered || sharpenActive) && (
          <AnimatedItem>
            <SharpenDiagnosisBanner
              companyId={selectedCompanyId}
              autoGenerate={sharpenActive}
              onComplete={() => {
                setSharpenActive(false)
                fetchData()
              }}
            />
          </AnimatedItem>
        )}

        {/* Category Grid */}
        <AnimatedItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.categories.map(cat => (
              <CategoryPanel
                key={cat.category}
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
                onExpand={() => setExpandedCategory(cat.category)}
                onCollapse={() => setExpandedCategory(null)}
                nextPromptDate={cadenceNextDates[cat.category] ?? null}
                financialContext={cat.financialContext}
              />
            ))}
          </div>
        </AnimatedItem>

        {/* Risk Drivers */}
        <AnimatedItem>
          <RiskDriversSection
            riskDrivers={data.riskDrivers}
            hasAssessment={data.hasAssessment}
            isFreeUser={isFreeUser}
            onUpgrade={() => setUpgradeModalOpen(true)}
            onExpandCategory={handleExpandCategory}
          />
        </AnimatedItem>

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
