'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RiskDriverRow } from './RiskDriverRow'
import { formatCurrency } from '@/lib/utils/currency'

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

interface RiskDriversSectionProps {
  riskDrivers: RiskDriver[]
  hasAssessment: boolean
  assessedCategoryCount?: number
  totalCategories?: number
  isFreeUser?: boolean
  onUpgrade?: () => void
  onExpandCategory?: (category: string) => void
}

export function RiskDriversSection({
  riskDrivers,
  hasAssessment,
  assessedCategoryCount = 0,
  totalCategories = 6,
  isFreeUser = false,
  onUpgrade,
  onExpandCategory,
}: RiskDriversSectionProps) {
  const [showAll, setShowAll] = useState(false)

  // Calculate aggregate totals
  const totalAtRisk = riskDrivers.reduce((sum, d) => sum + d.dollarImpact, 0)
  const completedDrivers = riskDrivers.filter(d => d.linkedTaskStatus === 'COMPLETED')
  const recoveredValue = completedDrivers.reduce((sum, d) => sum + d.dollarImpact, 0)

  // Pre-assessment: teaser stat
  if (!hasAssessment) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Value at Risk</h2>
          <p className="text-sm text-muted-foreground">See exactly where buyers would discount your company</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">$200K &ndash; $1.2M</p>
              <p className="text-sm text-muted-foreground mt-1">in quick-win value gaps you could close within 30 days</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The average business we assess has significant gaps that buyers will discount. Most owners don&apos;t know where theirs are.
            </p>
            <Button
              onClick={() => {
                if (onExpandCategory) {
                  onExpandCategory('FINANCIAL')
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
            >
              Find My Gaps
              <span className="ml-1">&rarr;</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (riskDrivers.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Value at Risk</h2>
          <p className="text-sm text-muted-foreground">Specific gaps ranked by dollar impact on your valuation</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No significant risk drivers found. Your buyer readiness is strong!
          </p>
        </div>
      </div>
    )
  }

  const visibleDrivers = showAll ? riskDrivers : riskDrivers.slice(0, 5)
  const isPartialAssessment = assessedCategoryCount > 0 && assessedCategoryCount < totalCategories

  return (
    <div>
      {/* Section header with aggregate total */}
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Value at Risk</h2>
          <p className="text-sm text-muted-foreground">Specific gaps ranked by dollar impact on your valuation</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-lg font-bold text-destructive">-{formatCurrency(totalAtRisk)}</p>
          {recoveredValue > 0 && (
            <p className="text-sm font-medium text-emerald-600">
              Recovered: +{formatCurrency(recoveredValue)}
            </p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="px-5">
          {visibleDrivers.map((driver, index) => (
            <div key={driver.id}>
              <RiskDriverRow
                rank={index + 1}
                name={driver.name}
                category={driver.category}
                categoryLabel={driver.categoryLabel}
                dollarImpact={driver.dollarImpact}
                optionPosition={driver.optionPosition}
                totalOptions={driver.totalOptions}
                buyerLogic={driver.buyerLogic}
                hasLinkedTask={driver.hasLinkedTask}
                linkedTaskId={driver.linkedTaskId}
                linkedTaskTitle={driver.linkedTaskTitle}
                linkedTaskStatus={driver.linkedTaskStatus}
                isFreeUser={isFreeUser}
                onUpgrade={onUpgrade}
                onExpandCategory={onExpandCategory}
                financialContext={driver.financialContext}
              />
              {index < visibleDrivers.length - 1 && (
                <div className="border-t border-border" />
              )}
            </div>
          ))}
        </div>

        {/* Partial assessment footer */}
        {isPartialAssessment && (
          <div className="mx-5 mb-4 mt-1 rounded-lg bg-muted/30 border border-border/60 p-3">
            <p className="text-sm text-muted-foreground">
              Based on {assessedCategoryCount} of {totalCategories} categories.{' '}
              Complete the remaining categories to see the full picture.
            </p>
          </div>
        )}

        {riskDrivers.length > 5 && (
          <div className="px-5 pb-4">
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Show less \u2191'
                : `Show all ${riskDrivers.length} gaps \u2193`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
