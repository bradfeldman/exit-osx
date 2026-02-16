'use client'

import Link from 'next/link'
import { ClipboardCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProgression } from '@/contexts/ProgressionContext'

const ALL_CATEGORIES = [
  { key: 'FINANCIAL', label: 'Financial' },
  { key: 'TRANSFERABILITY', label: 'Transferability' },
  { key: 'OPERATIONAL', label: 'Operations' },
  { key: 'MARKET', label: 'Market' },
  { key: 'LEGAL_TAX', label: 'Legal & Tax' },
  { key: 'PERSONAL', label: 'Personal' },
]

export function AssessmentPriorityCard() {
  const { progressionData } = useProgression()
  if (!progressionData) return null

  const { hasFullAssessment, assessedCategories, assessedCategoryCount } = progressionData

  // Don't show if all 6 categories assessed
  if (hasFullAssessment) return null

  const completedCount = assessedCategoryCount
  const nextCategory = ALL_CATEGORIES.find(c => !assessedCategories.includes(c.key))

  return (
    <div className="bg-card border-2 border-primary/20 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Complete Your Assessment</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            A full assessment unlocks personalized tasks based on what buyers actually care about for your business.
          </p>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{completedCount} of 6 categories</span>
              <span>{Math.round((completedCount / 6) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {ALL_CATEGORIES.map(cat => {
              const isComplete = assessedCategories.includes(cat.key)
              return (
                <span
                  key={cat.key}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isComplete && <Check className="w-3 h-3" />}
                  {cat.label}
                </span>
              )
            })}
          </div>

          {/* CTA */}
          {nextCategory && (
            <div className="mt-4">
              <Link href={`/dashboard/diagnosis?expand=${nextCategory.key}`}>
                <Button size="sm">
                  {completedCount === 0 ? 'Start Assessment' : `Continue with ${nextCategory.label}`} →
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
