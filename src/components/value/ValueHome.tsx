'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useExposure } from '@/contexts/ExposureContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { HeroMetricsBar } from './HeroMetricsBar'
import { ValuationBridge } from './ValuationBridge'
import { NextMoveCard } from './NextMoveCard'
import { ProgressContext } from './ProgressContext'
import { ValueTimeline } from './ValueTimeline'
import { ValueHomeLoading } from './ValueHomeLoading'
import { ValueHomeError } from './ValueHomeError'
import { ValueLedgerSection } from '@/components/value-ledger/ValueLedgerSection'
import { DisclosureTrigger } from '@/components/disclosures/DisclosureTrigger'
import { DriftReportBanner } from '@/components/drift-report/DriftReportBanner'
import { WeeklyCheckInTrigger } from '@/components/weekly-check-in/WeeklyCheckInTrigger'
import { CoreScoreCard } from './CoreScoreCard'
import { WhatIfScenarios } from './WhatIfScenarios'
import { ProceedsWaterfall } from './ProceedsWaterfall'
import { SignalSummaryCard } from './SignalSummaryCard'
import { ActivePlaybooksRow } from './ActivePlaybooksRow'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { PlatformTour } from './PlatformTour'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SinceLastVisitBanner } from './SinceLastVisitBanner'
import { EmailVerificationBanner } from './EmailVerificationBanner'
import type { CoreFactors } from '@/lib/valuation/calculate-valuation'

interface DashboardData {
  company: {
    id: string
    name: string
    annualRevenue: number
    annualEbitda: number
    adjustedEbitda: number
  }
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    marketPremium: number
    briScore: number | null
    coreScore: number | null
    finalMultiple: number
    multipleRange: { low: number; high: number }
    industryName: string
    isEstimated: boolean
    useDCFValue?: boolean
    hasCustomMultiples?: boolean
    multipleSource?: string | null
    multipleAsOf?: string | null
    // V2 fields
    bqsScore?: number | null
    drsScore?: number | null
    rssScore?: number | null
    evRange?: { low: number; mid: number; high: number } | null
    riskDiscounts?: Array<{ name: string; rate: number; explanation: string }> | null
    qualityAdjustments?: Array<{ factor: string; impact: number; explanation: string }> | null
  } | null
  tier2: {
    adjustedEbitda: number
    isEbitdaEstimated: boolean
    isEbitdaFromFinancials: boolean
    ebitdaSource: string
    fiscalYear: number | null
    multipleRange: { low: number; high: number; current: number }
    hasCustomMultiples: boolean
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string; dcfValue: number | null }>
    briTrend: { direction: string; change: number } | null
    exitWindow: string | null
    annotations: Array<{
      date: string
      label: string
      detail: string
      impact: string
      type: 'positive' | 'negative' | 'neutral'
    }>
  }
  bridgeCategories: Array<{
    category: string
    label: string
    score: number
    dollarImpact: number
    weight: number
    buyerExplanation: string
  }>
  topSignals: Array<{
    id: string
    title: string
    severity: string
    category: string | null
    createdAt: string
    estimatedValueImpact: number | null
  }>
  valueGapDelta: number | null
  previousValueGap: number | null
  progressContext: {
    valueRecoveredLifetime: number
    valueAtRiskCurrent: number
    openSignalCount: number
    valueRecoveredThisMonth: number
    valueAtRiskThisMonth: number
    ledgerEventsThisMonth: number
  }
  nextMove: {
    task: {
      id: string
      title: string
      description: string
      briCategory: string
      estimatedHours: number | null
      rawImpact: number
      status: string
      buyerConsequence: string | null
      effortLevel: string
      startedAt: string | null
    } | null
    comingUp: Array<{
      id: string
      title: string
      estimatedHours: number | null
      rawImpact: number
      briCategory: string
    }>
  }
  proceedsInputs?: {
    currentValue: number
    netDebt: number
    ownershipPercent: number
    entityType: string | null
  } | null
  dcfValuation: {
    enterpriseValue: number
    equityValue: number | null
    wacc: number | null
    impliedMultiple: number | null
    source: 'auto' | 'manual'
    multipleBasedValue: number
    divergenceRatio: number | null
    confidenceSignal: 'high' | 'moderate' | 'low'
  } | null
  coreFactors: (CoreFactors & { coreScore: number | null }) | null
  hasAssessment: boolean
  sinceLastVisit?: Array<{ type: string; message: string; date: string }>
  lastVisitAt?: string | null
  emailVerified?: boolean
}

export function ValueHome() {
  const { selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  useExposure() // keep context mounted
  const { progressionData } = useProgression()
  const hasFullAssessment = progressionData?.hasFullAssessment ?? false
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFreeUser = planTier === 'foundation'
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined)
  const [upgradeFeatureName, setUpgradeFeatureName] = useState<string | undefined>(undefined)
  const [showTour, setShowTour] = useState(false)
  const [tourKey, setTourKey] = useState(0)
  const [activePlaybooks, setActivePlaybooks] = useState<Array<{ id: string; title: string; percentComplete: number; category: string }>>([])

  // Fetch active playbooks for the ActivePlaybooksRow
  useEffect(() => {
    if (!selectedCompanyId) return
    fetch(`/api/companies/${selectedCompanyId}/active-playbooks`)
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        if (result?.playbooks) setActivePlaybooks(result.playbooks)
      })
      .catch(() => {})
  }, [selectedCompanyId])

  const handleUpgrade = useCallback((feature?: string, featureName?: string) => {
    setUpgradeFeature(feature)
    setUpgradeFeatureName(featureName)
    setUpgradeModalOpen(true)
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-open platform tour on first visit to Value page
  useEffect(() => {
    if (!isLoading && data && !localStorage.getItem('exitosx-tour-seen')) {
      const timer = setTimeout(() => {
        setTourKey((k) => k + 1)
        setShowTour(true)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isLoading, data])

  // Open tour from notification link (?tour=open)
  useEffect(() => {
    if (!isLoading && data && searchParams.get('tour') === 'open') {
      setTourKey((k) => k + 1)
      setShowTour(true)
      // Clean up URL
      router.replace('/dashboard', { scroll: false })
    }
  }, [isLoading, data, searchParams, router])

  const handleTourComplete = useCallback(() => {
    localStorage.setItem('exitosx-tour-seen', 'true')
    setShowTour(false)
  }, [])

  if (isLoading) return <ValueHomeLoading />
  if (error || !data) return <ValueHomeError onRetry={fetchData} />

  const tier1 = data.tier1

  return (
    <div className="max-w-5xl mx-auto sm:px-2 py-2 sm:py-8">
      <div className="hidden sm:flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { setTourKey((k) => k + 1); setShowTour(true) }}
        >
          <Compass className="h-4 w-4" />
          Take Tour
        </Button>
      </div>
      <EmailVerificationBanner emailVerified={data.emailVerified ?? true} />
      <SinceLastVisitBanner events={data.sinceLastVisit ?? []} lastVisitAt={data.lastVisitAt ?? null} />
      <AnimatedStagger className="space-y-4 sm:space-y-8" staggerDelay={0.15}>
        {/* Check-In: show only ONE at a time — Weekly takes priority over Quick Check */}
        {hasFullAssessment && (
          <AnimatedItem>
            <CheckInSlot onRefresh={fetchData} />
          </AnimatedItem>
        )}

        {/* Hero Metrics Bar — 2-col: Valuation + BRI */}
        <AnimatedItem>
          <HeroMetricsBar
            currentValue={tier1?.currentValue ?? 0}
            potentialValue={tier1?.potentialValue ?? 0}
            valueGap={tier1?.valueGap ?? 0}
            valueGapDelta={data.valueGapDelta}
            briScore={tier1?.briScore ?? null}
            isEstimated={tier1?.isEstimated ?? true}
            hasAssessment={data.hasAssessment}
            isEbitdaFromFinancials={data.tier2?.isEbitdaFromFinancials ?? false}
            dcfValuation={data.dcfValuation}
            drsScore={tier1?.drsScore ?? null}
            evRange={tier1?.evRange ?? null}
            bridgeCategories={data.bridgeCategories}
            valueTrend={data.tier5.valueTrend}
            finalMultiple={tier1?.finalMultiple}
            adjustedEbitda={data.tier2?.adjustedEbitda}
          />
        </AnimatedItem>

        {/* Valuation Bridge — "Where to Improve" */}
        <AnimatedItem>
          <ValuationBridge
            bridgeCategories={data.bridgeCategories}
            hasAssessment={data.hasAssessment}
            onCategoryClick={(category) => {
              router.push(`/dashboard/diagnosis?expand=${category}`)
            }}
            onAssessmentStart={() => {
              router.push('/dashboard/diagnosis?expand=FINANCIAL')
            }}
          />
        </AnimatedItem>

        {/* Next Move Card — "Your Next Move" */}
        <AnimatedItem>
          <NextMoveCard
            task={data.nextMove.task}
            comingUp={data.nextMove.comingUp}
            isFreeUser={isFreeUser}
            onUpgrade={() => handleUpgrade('action-plan', 'Action Plan')}
            planTier={planTier}
          />
        </AnimatedItem>

        {/* Active Playbooks Row */}
        <ActivePlaybooksRow playbooks={activePlaybooks} />

        {/* Core Score Card — structural factors */}
        {data.coreFactors?.coreScore != null && tier1 && (
          <AnimatedItem>
            <CoreScoreCard
              coreFactors={data.coreFactors as { revenueModel: string; grossMarginProxy: string; laborIntensity: string; assetIntensity: string; ownerInvolvement: string; coreScore: number | null }}
              multipleRange={tier1.multipleRange}
              finalMultiple={tier1.finalMultiple}
            />
          </AnimatedItem>
        )}

        {/* Signal Summary Card — top recent signals */}
        <AnimatedItem>
          <SignalSummaryCard signals={data.topSignals ?? []} />
        </AnimatedItem>

        {/* What-If Scenarios — hidden on mobile (complex interactive tool) */}
        <AnimatedItem>
          <div id="what-if-scenarios" className="hidden sm:block">
          <WhatIfScenarios
            coreFactors={data.coreFactors}
            adjustedEbitda={data.tier2?.adjustedEbitda ?? 0}
            industryMultipleLow={tier1?.multipleRange?.low ?? 3}
            industryMultipleHigh={tier1?.multipleRange?.high ?? 6}
            currentValue={tier1?.currentValue ?? 0}
            briScore={tier1?.briScore ?? 50}
            currentMultiple={tier1?.finalMultiple ?? 0}
            hasAssessment={hasFullAssessment}
            isFreeUser={isFreeUser}
            onUpgrade={() => handleUpgrade('company-assessment', 'What-If Scenarios')}
            companyId={selectedCompanyId ?? undefined}
            onCoreFactorSaved={fetchData}
          />
          </div>
        </AnimatedItem>

        {/* Proceeds Waterfall — hidden on mobile (complex interactive tool) */}
        <AnimatedItem>
          <div className="hidden sm:block">
          <ProceedsWaterfall
            isFreeUser={isFreeUser}
            onUpgrade={() => handleUpgrade('proceeds-waterfall', 'Net Proceeds Calculator')}
            proceedsInputs={data.proceedsInputs}
          />
          </div>
        </AnimatedItem>

        {/* Progress Context: Recovered / At Risk / Gap */}
        <AnimatedItem>
          <ProgressContext
            valueRecoveredLifetime={data.progressContext.valueRecoveredLifetime}
            valueAtRiskCurrent={data.progressContext.valueAtRiskCurrent}
            openSignalCount={data.progressContext.openSignalCount}
            valueRecoveredThisMonth={data.progressContext.valueRecoveredThisMonth}
            valueAtRiskThisMonth={data.progressContext.valueAtRiskThisMonth}
            valueGap={tier1?.valueGap ?? 0}
            valueGapDelta={data.valueGapDelta}
          />
        </AnimatedItem>

        {/* Value Ledger Summary */}
        <AnimatedItem>
          <ValueLedgerSection />
        </AnimatedItem>

        {/* Drift Report Banner */}
        <AnimatedItem>
          <DriftReportBanner />
        </AnimatedItem>

        {/* Value Timeline — now blue */}
        <AnimatedItem>
          <ValueTimeline
            valueTrend={data.tier5.valueTrend}
            annotations={data.tier5.annotations}
          />
        </AnimatedItem>
      </AnimatedStagger>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
        featureDisplayName={upgradeFeatureName}
      />

      <PlatformTour key={tourKey} open={showTour} onComplete={handleTourComplete} />
    </div>
  )
}

/** Shows only one check-in at a time: Weekly Check-In takes priority over Quick Check */
function CheckInSlot({ onRefresh }: { onRefresh?: () => void }) {
  const [weeklyVisible, setWeeklyVisible] = useState<boolean | null>(null)

  return (
    <>
      <WeeklyCheckInTrigger
        onRefresh={onRefresh}
        onVisibilityChange={setWeeklyVisible}
      />
      {weeklyVisible === false && (
        <DisclosureTrigger onRefresh={onRefresh} />
      )}
    </>
  )
}
