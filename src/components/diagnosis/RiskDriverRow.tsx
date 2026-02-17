'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/currency'

interface RiskDriverRowProps {
  rank: number
  name: string
  category: string
  categoryLabel: string
  dollarImpact: number
  optionPosition: number
  totalOptions: number
  buyerLogic: string | null
  hasLinkedTask: boolean
  linkedTaskId: string | null
  linkedTaskTitle: string | null
  linkedTaskStatus: string | null
  isFreeUser?: boolean
  onUpgrade?: () => void
  onExpandCategory?: (category: string) => void
  financialContext?: {
    ebitda: number
    source: string
    benchmarkMultiple: string | null
  } | null
}

export function RiskDriverRow({
  rank,
  name,
  category,
  categoryLabel,
  dollarImpact,
  optionPosition,
  totalOptions,
  buyerLogic,
  hasLinkedTask,
  linkedTaskId,
  linkedTaskTitle,
  linkedTaskStatus,
  isFreeUser = false,
  onUpgrade,
  onExpandCategory,
  financialContext,
}: RiskDriverRowProps) {
  const router = useRouter()

  const handleTaskCta = () => {
    if (isFreeUser) {
      onUpgrade?.()
      return
    }
    if (linkedTaskId) {
      router.push(`/dashboard/actions?taskId=${linkedTaskId}`)
    }
  }

  // Special CTA for Financial Opacity
  const isFinancialOpacity = name === 'Financial Opacity'

  const isCompleted = linkedTaskStatus === 'COMPLETED'

  return (
    <div className={cn('py-4', isCompleted && 'bg-emerald-50/30')}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className={cn(
            'text-lg font-bold w-6 shrink-0 relative',
            isCompleted ? 'text-emerald-500' : 'text-muted-foreground/50'
          )}>
            {isCompleted ? '\u2713' : rank}
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {categoryLabel} · Score: {optionPosition} of {totalOptions}
            </p>
            {buyerLogic && (
              <p className="text-sm text-muted-foreground italic mt-1">
                &ldquo;{buyerLogic}&rdquo;
              </p>
            )}
            {financialContext && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on {formatCurrency(financialContext.ebitda)} EBITDA
                {financialContext.benchmarkMultiple && ` at ${financialContext.benchmarkMultiple}`}
                <span className="ml-1">({financialContext.source})</span>
              </p>
            )}

            {/* CTAs */}
            <div className="flex gap-2 mt-2">
              {isFinancialOpacity ? (
                <>
                  <Button size="sm" onClick={() => {
                    if (isFreeUser) { onUpgrade?.(); return }
                    router.push('/dashboard/financials')
                  }}>
                    Connect QuickBooks
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (isFreeUser) { onUpgrade?.(); return }
                    router.push('/dashboard/financials')
                  }}>
                    Upload Financials
                  </Button>
                </>
              ) : hasLinkedTask ? (
                isCompleted ? (
                  <Button size="sm" variant="ghost" disabled className="text-emerald-600 opacity-100">
                    Resolved
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleTaskCta}>
                    {linkedTaskStatus === 'IN_PROGRESS'
                      ? `Continue: ${linkedTaskTitle?.slice(0, 30) ?? 'Task'}`
                      : `Start: ${linkedTaskTitle?.slice(0, 30) ?? 'Fix this'} \u2192`
                    }
                  </Button>
                )
              ) : (
                <Button size="sm" variant="outline" onClick={() => {
                  if (onExpandCategory) {
                    // Scroll to top and expand the category's inline assessment
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    onExpandCategory(category)
                  } else {
                    router.push('/dashboard/diagnosis')
                  }
                }}>
                  Review & Update
                </Button>
              )}
            </div>
          </div>
        </div>

        <span className={cn(
          'text-base font-bold whitespace-nowrap ml-4',
          isCompleted ? 'text-muted-foreground/40 line-through' : 'text-destructive'
        )}>
          -{formatCurrency(dollarImpact)}
        </span>
      </div>
    </div>
  )
}
