'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Lock, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useCountUpCurrency } from '@/hooks/useCountUp'
import {
  CORE_FACTOR_SCORES,
  calculateCoreScore,
  calculateValuation,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'

interface WhatIfScenariosProps {
  coreFactors: CoreFactors | null
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  currentValue: number
  briScore: number // 0-100 scale
  currentMultiple: number
  hasAssessment: boolean
  isFreeUser?: boolean
}

const FACTOR_CONFIG: Record<
  keyof typeof CORE_FACTOR_SCORES,
  { label: string; description: string; options: { value: string; label: string }[] }
> = {
  revenueModel: {
    label: 'Revenue Model',
    description: 'How predictable is your revenue?',
    options: [
      { value: 'PROJECT_BASED', label: 'Project-Based' },
      { value: 'TRANSACTIONAL', label: 'Transactional' },
      { value: 'RECURRING_CONTRACTS', label: 'Recurring Contracts' },
      { value: 'SUBSCRIPTION_SAAS', label: 'Subscription / SaaS' },
    ],
  },
  grossMarginProxy: {
    label: 'Gross Margin',
    description: 'What are your margins like?',
    options: [
      { value: 'LOW', label: 'Low (<30%)' },
      { value: 'MODERATE', label: 'Moderate (30-50%)' },
      { value: 'GOOD', label: 'Good (50-70%)' },
      { value: 'EXCELLENT', label: 'Excellent (70%+)' },
    ],
  },
  laborIntensity: {
    label: 'Labor Intensity',
    description: 'How dependent is delivery on headcount?',
    options: [
      { value: 'VERY_HIGH', label: 'Very High' },
      { value: 'HIGH', label: 'High' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'LOW', label: 'Low' },
    ],
  },
  assetIntensity: {
    label: 'Asset Intensity',
    description: 'How capital-intensive is the business?',
    options: [
      { value: 'ASSET_HEAVY', label: 'Asset Heavy' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'ASSET_LIGHT', label: 'Asset Light' },
    ],
  },
  ownerInvolvement: {
    label: 'Owner Involvement',
    description: 'How dependent is the business on you?',
    options: [
      { value: 'CRITICAL', label: 'Critical' },
      { value: 'HIGH', label: 'High' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'LOW', label: 'Low' },
      { value: 'MINIMAL', label: 'Minimal' },
    ],
  },
}

const BUYER_INSIGHTS: Record<string, string> = {
  revenueModel: 'Buyers pay premiums for predictable, recurring revenue streams.',
  grossMarginProxy: 'Higher margins signal pricing power and scalability to acquirers.',
  laborIntensity: 'Lower labor dependency means the business scales without linear headcount growth.',
  assetIntensity: 'Asset-light businesses require less capital to maintain and grow.',
  ownerInvolvement: 'Buyers discount businesses that can\'t operate without the founder.',
}

type FactorKey = keyof typeof CORE_FACTOR_SCORES

export function WhatIfScenarios({
  coreFactors,
  adjustedEbitda,
  industryMultipleLow,
  industryMultipleHigh,
  currentValue,
  briScore,
  currentMultiple,
  hasAssessment,
  isFreeUser = false,
}: WhatIfScenariosProps) {
  const [selectedFactor, setSelectedFactor] = useState<FactorKey | null>(null)
  const [hypotheticalValue, setHypotheticalValue] = useState<string | null>(null)

  const result = useMemo(() => {
    if (!selectedFactor || !hypotheticalValue || !coreFactors) return null

    // Build hypothetical core factors
    const hypotheticalFactors: CoreFactors = {
      ...coreFactors,
      [selectedFactor]: hypotheticalValue,
    }

    const newCoreScore = calculateCoreScore(hypotheticalFactors)
    const newValuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore: newCoreScore,
      briScore: briScore / 100,
    })

    const valueDelta = newValuation.currentValue - currentValue
    const multipleDelta = newValuation.finalMultiple - currentMultiple

    return {
      newValue: newValuation.currentValue,
      valueDelta,
      multipleDelta,
      newMultiple: newValuation.finalMultiple,
    }
  }, [selectedFactor, hypotheticalValue, coreFactors, adjustedEbitda, industryMultipleLow, industryMultipleHigh, briScore, currentValue, currentMultiple])

  const { value: animatedDelta } = useCountUpCurrency(
    Math.abs(result?.valueDelta ?? 0)
  )

  if (!hasAssessment) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {isFreeUser
              ? 'Upgrade to unlock What-If Scenarios'
              : 'Complete your assessment to unlock What-If Scenarios'}
          </p>
          <p className="text-xs text-muted-foreground/60">
            See how improving specific business factors could change your valuation
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentFactorValue = selectedFactor && coreFactors
    ? coreFactors[selectedFactor as keyof CoreFactors]
    : null

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">
          What-If Scenarios
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how improving a business factor could change your valuation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Factor Selection */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FACTOR_CONFIG) as FactorKey[]).map((key) => (
            <Button
              key={key}
              variant={selectedFactor === key ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => {
                setSelectedFactor(key)
                setHypotheticalValue(null)
              }}
            >
              {FACTOR_CONFIG[key].label}
            </Button>
          ))}
        </div>

        {/* Hypothetical Value Selection */}
        {selectedFactor && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {FACTOR_CONFIG[selectedFactor].description}
            </p>
            <div className="flex items-center gap-3">
              {currentFactorValue && (
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                  Current: {FACTOR_CONFIG[selectedFactor].options.find(o => o.value === currentFactorValue)?.label ?? currentFactorValue}
                </span>
              )}
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <Select
                value={hypotheticalValue ?? ''}
                onValueChange={setHypotheticalValue}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="What if it were..." />
                </SelectTrigger>
                <SelectContent>
                  {FACTOR_CONFIG[selectedFactor].options
                    .filter(o => o.value !== currentFactorValue)
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Result Card */}
        {result && hypotheticalValue && (
          <div
            className={`rounded-lg border p-4 ${
              result.valueDelta > 0
                ? 'border-emerald-200 bg-emerald-50/50'
                : result.valueDelta < 0
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {result.valueDelta > 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : result.valueDelta < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : null}
                  <span
                    className={`text-lg font-bold ${
                      result.valueDelta > 0
                        ? 'text-emerald-700'
                        : result.valueDelta < 0
                          ? 'text-red-700'
                          : 'text-foreground'
                    }`}
                  >
                    {result.valueDelta > 0 ? '+' : result.valueDelta < 0 ? '-' : ''}
                    ${animatedDelta}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Multiple: {currentMultiple.toFixed(2)}x → {result.newMultiple.toFixed(2)}x
                  ({result.multipleDelta > 0 ? '+' : ''}{result.multipleDelta.toFixed(2)}x)
                </p>
              </div>
            </div>
            {selectedFactor && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                {BUYER_INSIGHTS[selectedFactor]}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
