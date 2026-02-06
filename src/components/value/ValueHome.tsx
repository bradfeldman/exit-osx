'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { HeroMetricsBar } from './HeroMetricsBar'
import { ValuationBridge } from './ValuationBridge'
import { NextMoveCard } from './NextMoveCard'
import { ValueTimeline } from './ValueTimeline'
import { ValueHomeLoading } from './ValueHomeLoading'
import { ValueHomeError } from './ValueHomeError'
import { ValueLedgerSection } from '@/components/value-ledger/ValueLedgerSection'
import { DisclosureTrigger } from '@/components/disclosures/DisclosureTrigger'

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
    valueTrend: Array<{ value: number; date: string }>
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
  valueGapDelta: number | null
  previousValueGap: number | null
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
  hasAssessment: boolean
}

export function ValueHome() {
  const { selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  const router = useRouter()
  const isFreeUser = planTier === 'foundation'
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (isLoading) return <ValueHomeLoading />
  if (error || !data) return <ValueHomeError onRetry={fetchData} />

  const tier1 = data.tier1

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnimatedStagger className="space-y-8" staggerDelay={0.15}>
        {/* Monthly Disclosure Check-in (shows only when pending) */}
        <AnimatedItem>
          <DisclosureTrigger />
        </AnimatedItem>

        {/* Hero Metrics Bar */}
        <AnimatedItem>
          <HeroMetricsBar
            currentValue={tier1?.currentValue ?? 0}
            potentialValue={tier1?.potentialValue ?? 0}
            valueGap={tier1?.valueGap ?? 0}
            valueGapDelta={data.valueGapDelta}
            isEstimated={tier1?.isEstimated ?? true}
            hasAssessment={data.hasAssessment}
            isEbitdaFromFinancials={data.tier2?.isEbitdaFromFinancials ?? false}
          />
        </AnimatedItem>

        {/* Valuation Bridge */}
        <AnimatedItem>
          <ValuationBridge
            bridgeCategories={data.bridgeCategories}
            hasAssessment={data.hasAssessment}
            onCategoryClick={(category) => {
              // Navigate to diagnosis page and expand that category's inline assessment
              router.push(`/dashboard/diagnosis?expand=${category}`)
            }}
            onAssessmentStart={() => {
              router.push('/dashboard/diagnosis')
            }}
          />
        </AnimatedItem>

        {/* Next Move Card */}
        <AnimatedItem>
          <NextMoveCard
            task={data.nextMove.task}
            comingUp={data.nextMove.comingUp}
            isFreeUser={isFreeUser}
          />
        </AnimatedItem>

        {/* Value Ledger Summary */}
        <AnimatedItem>
          <ValueLedgerSection />
        </AnimatedItem>

        {/* Value Timeline */}
        <AnimatedItem>
          <ValueTimeline
            valueTrend={data.tier5.valueTrend}
            annotations={data.tier5.annotations}
          />
        </AnimatedItem>
      </AnimatedStagger>
    </div>
  )
}
