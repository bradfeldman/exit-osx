'use client'

import { CORE_FACTOR_SCORES } from '@/lib/valuation/calculate-valuation'

const FACTOR_LABELS: Record<string, string> = {
  revenueModel: 'Revenue Model',
  grossMarginProxy: 'Gross Margin',
  laborIntensity: 'Labor Intensity',
  assetIntensity: 'Asset Intensity',
  ownerInvolvement: 'Owner Involvement',
}

const FACTOR_VALUE_LABELS: Record<string, Record<string, string>> = {
  revenueModel: {
    PROJECT_BASED: 'Project-Based',
    TRANSACTIONAL: 'Transactional',
    RECURRING_CONTRACTS: 'Recurring Contracts',
    SUBSCRIPTION_SAAS: 'Subscription / SaaS',
  },
  grossMarginProxy: {
    LOW: 'Low (<30%)',
    MODERATE: 'Moderate (30-50%)',
    GOOD: 'Good (50-70%)',
    EXCELLENT: 'Excellent (>70%)',
  },
  laborIntensity: {
    VERY_HIGH: 'Very High',
    HIGH: 'High',
    MODERATE: 'Moderate',
    LOW: 'Low',
  },
  assetIntensity: {
    ASSET_HEAVY: 'Asset Heavy',
    MODERATE: 'Moderate',
    ASSET_LIGHT: 'Asset Light',
  },
  ownerInvolvement: {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MODERATE: 'Moderate',
    LOW: 'Low',
    MINIMAL: 'Minimal',
  },
}

interface CoreScoreCardProps {
  coreFactors: {
    revenueModel: string
    grossMarginProxy: string
    laborIntensity: string
    assetIntensity: string
    ownerInvolvement: string
    coreScore: number | null
  }
  multipleRange: { low: number; high: number }
  finalMultiple: number
}

export function CoreScoreCard({ coreFactors, multipleRange, finalMultiple }: CoreScoreCardProps) {
  const coreScore = coreFactors.coreScore
  if (coreScore === null) return null

  const factors = ['revenueModel', 'grossMarginProxy', 'laborIntensity', 'assetIntensity', 'ownerInvolvement'] as const
  const baseMultiple = multipleRange.low + coreScore * (multipleRange.high - multipleRange.low)

  // Position as percentage within range for the dot
  const rangeSpan = multipleRange.high - multipleRange.low
  const positionPct = rangeSpan > 0 ? ((baseMultiple - multipleRange.low) / rangeSpan) * 100 : 50

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">YOUR BUSINESS PROFILE</h2>
        <p className="text-sm text-muted-foreground">
          These structural factors determine your base position in the industry range. BRI then adjusts up or down from there.
        </p>
      </div>

      {/* Multiple positioning visual */}
      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{multipleRange.low.toFixed(1)}x</span>
          <span className="font-medium text-foreground">Base: {baseMultiple.toFixed(1)}x</span>
          <span>{multipleRange.high.toFixed(1)}x</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm"
            style={{ left: `clamp(6px, calc(${positionPct}% - 6px), calc(100% - 6px))` }}
          />
          {/* Show final multiple (after BRI discount) as a second marker if different */}
          {Math.abs(finalMultiple - baseMultiple) > 0.05 && (() => {
            const finalPct = rangeSpan > 0
              ? ((Math.max(multipleRange.low, Math.min(finalMultiple, multipleRange.high)) - multipleRange.low) / rangeSpan) * 100
              : 50
            return (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-background shadow-sm"
                style={{ left: `clamp(5px, calc(${finalPct}% - 5px), calc(100% - 5px))` }}
                title={`Current: ${finalMultiple.toFixed(1)}x (after BRI adjustment)`}
              />
            )
          })()}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>Industry Low</span>
          <span>Industry High</span>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-3">
        {factors.map(factor => {
          const value = coreFactors[factor]
          const score = CORE_FACTOR_SCORES[factor]?.[value] ?? 0.5
          const label = FACTOR_LABELS[factor]
          const valueLabel = FACTOR_VALUE_LABELS[factor]?.[value] ?? value

          return (
            <div key={factor} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground ml-2 truncate">{valueLabel}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score * 100}%`,
                      backgroundColor: score >= 0.75 ? '#22c55e' : score >= 0.5 ? '#3b82f6' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <span className="inline-block w-3 h-3 rounded-full bg-primary mr-1.5 align-middle" />
          Base multiple ({baseMultiple.toFixed(1)}x) from business profile
          {Math.abs(finalMultiple - baseMultiple) > 0.05 && (
            <>
              {' '}&middot;{' '}
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1 align-middle" />
              Current ({finalMultiple.toFixed(1)}x) after BRI adjustment
            </>
          )}
        </p>
      </div>
    </div>
  )
}
