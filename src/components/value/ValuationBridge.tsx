'use client'

import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { ChevronRight, ArrowRight } from 'lucide-react'

interface BridgeCategory {
  category: string
  label: string
  score: number
  dollarImpact: number
  weight: number
  buyerExplanation: string
}

interface ValuationBridgeProps {
  bridgeCategories: BridgeCategory[]
  hasAssessment: boolean
  onCategoryClick?: (category: string) => void
  onAssessmentStart?: () => void
}

type HealthLevel = 'strong' | 'moderate' | 'needs-work'

function getHealthLevel(score: number): HealthLevel {
  if (score >= 75) return 'strong'
  if (score >= 50) return 'moderate'
  return 'needs-work'
}

const HEALTH_CONFIG: Record<HealthLevel, { label: string; dotClass: string; tagClass: string }> = {
  strong: {
    label: 'Strong',
    dotClass: 'bg-emerald-500',
    tagClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  moderate: {
    label: 'Moderate',
    dotClass: 'bg-blue-500',
    tagClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  'needs-work': {
    label: 'Needs Work',
    dotClass: 'bg-amber-500',
    tagClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
}

export function ValuationBridge({
  bridgeCategories,
  hasAssessment,
  onCategoryClick,
  onAssessmentStart,
}: ValuationBridgeProps) {
  // Sort: biggest dollar impact first (most opportunity)
  const sorted = [...bridgeCategories].sort((a, b) => b.dollarImpact - a.dollarImpact)
  const totalGap = sorted.reduce((sum, c) => sum + c.dollarImpact, 0)
  const needsWorkCount = sorted.filter(c => getHealthLevel(c.score) === 'needs-work').length

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Where to Improve</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalGap > 0
            ? `These categories account for ${formatCurrency(totalGap)} in recoverable value. Tap any area to dig deeper.`
            : 'How each part of your business contributes to your overall readiness.'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl relative overflow-hidden">
        {/* Preview state overlay */}
        {!hasAssessment && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl z-10">
            <p className="text-sm text-muted-foreground mb-3 text-center max-w-xs">
              Based on industry averages. Complete your assessment for a personalized breakdown.
            </p>
            <Button onClick={onAssessmentStart}>Start Assessment <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        )}

        {sorted.length > 0 ? (
          <div className="divide-y divide-border">
            {sorted.map(cat => {
              const health = getHealthLevel(cat.score)
              const config = HEALTH_CONFIG[health]
              const isCoreStructure = cat.category === 'CORE_STRUCTURE'

              return (
                <button
                  key={cat.category}
                  className="w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors group flex items-start gap-4"
                  onClick={() => onCategoryClick?.(cat.category)}
                >
                  {/* Health dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${config.dotClass}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground">{cat.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${config.tagClass}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cat.dollarImpact > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(cat.dollarImpact)} at stake
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                    {cat.buyerExplanation && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed pr-6">
                        {isCoreStructure
                          ? 'How your revenue model, margins, and owner involvement affect your starting valuation.'
                          : cat.buyerExplanation}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                No assessment data available yet.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Complete your assessment to see where to improve.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary footer */}
      {needsWorkCount > 0 && hasAssessment && (
        <p className="text-xs text-muted-foreground mt-3">
          {needsWorkCount} area{needsWorkCount > 1 ? 's' : ''} {needsWorkCount > 1 ? 'need' : 'needs'} attention.
          Improving the top category could recover up to {formatCurrency(sorted[0]?.dollarImpact ?? 0)} in value.
        </p>
      )}
    </div>
  )
}
