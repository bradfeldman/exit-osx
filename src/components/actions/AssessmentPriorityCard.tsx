'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProgression } from '@/contexts/ProgressionContext'
import { useCompany } from '@/contexts/CompanyContext'

const ALL_CATEGORIES = [
  { key: 'FINANCIAL', label: 'Financial' },
  { key: 'TRANSFERABILITY', label: 'Transferability' },
  { key: 'OPERATIONAL', label: 'Operations' },
  { key: 'MARKET', label: 'Market' },
  { key: 'LEGAL_TAX', label: 'Legal & Tax' },
  { key: 'PERSONAL', label: 'Personal' },
]

// Re-assessment is suggested after 90 days
const RE_ASSESSMENT_DAYS = 90

export function AssessmentPriorityCard() {
  const { progressionData } = useProgression()
  const { selectedCompanyId } = useCompany()
  const [reassessmentDismissed, setReassessmentDismissed] = useState(() => {
    if (typeof window !== 'undefined' && selectedCompanyId) {
      return !!sessionStorage.getItem(`reassess-dismissed-${selectedCompanyId}`)
    }
    return false
  })
  const [daysSinceAssessment, setDaysSinceAssessment] = useState<number>(0)
  const [shouldReassess, setShouldReassess] = useState(false)

  // Check for re-assessment cadence when assessment is complete
  useEffect(() => {
    if (!progressionData?.hasFullAssessment || !selectedCompanyId) return
    if (reassessmentDismissed) return

    // Fetch latest assessment date
    const checkCadence = async () => {
      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/progression`)
        if (!response.ok) return
        const data = await response.json()
        // Look for the most recent assessment completion
        if (data.latestAssessmentDate) {
          const assessDate = new Date(data.latestAssessmentDate)
          const days = Math.floor((Date.now() - assessDate.getTime()) / (1000 * 60 * 60 * 24))
          setDaysSinceAssessment(days)
          setShouldReassess(days >= RE_ASSESSMENT_DAYS)
        }
      } catch {
        // Non-critical
      }
    }
    checkCadence()
  }, [progressionData?.hasFullAssessment, selectedCompanyId, reassessmentDismissed])

  if (!progressionData) return null

  const { hasFullAssessment, assessedCategories, assessedCategoryCount } = progressionData

  // STATE 4: RE-ASSESSMENT DUE (all 6 assessed, but it's been a while)
  if (hasFullAssessment && shouldReassess && !reassessmentDismissed) {
    const daysSince = daysSinceAssessment || RE_ASSESSMENT_DAYS

    return (
      <div className="bg-card border-2 border-orange/20 dark:border-orange-dark/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-light dark:bg-orange-dark/30 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-orange-dark dark:text-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Time to Re-Assess</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              It&rsquo;s been {daysSince} days since your last assessment. Re-assessing ensures your action plan reflects current reality.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Link href="/dashboard/diagnosis">
                <Button size="sm" variant="default">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Re-Assess Now
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem(`reassess-dismissed-${selectedCompanyId}`, '1')
                  }
                  setReassessmentDismissed(true)
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STATE 3: COMPLETE - all 6 categories assessed (hide)
  if (hasFullAssessment) return null

  // STATE 1 & 2: INITIAL (0 assessed) or PARTIAL (1-5 assessed)
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
                      ? 'bg-green-light text-green-dark dark:bg-green-dark/30 dark:text-green'
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
                  {completedCount === 0 ? 'Start Assessment' : `Continue with ${nextCategory.label}`} &rarr;
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
