'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

export function RiskDriverRow({
  rank,
  name,
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
}: RiskDriverRowProps) {
  const router = useRouter()

  const handleTaskCta = () => {
    if (isFreeUser) {
      onUpgrade?.()
      return
    }
    if (linkedTaskId) {
      router.push(`/dashboard/playbook?taskId=${linkedTaskId}`)
    }
  }

  // Special CTA for Financial Opacity
  const isFinancialOpacity = name === 'Financial Opacity'

  return (
    <div className="py-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-lg font-bold text-muted-foreground/50 w-6 shrink-0">
            {rank}
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
                <Button size="sm" onClick={handleTaskCta}>
                  {linkedTaskStatus === 'COMPLETED'
                    ? '✓ Task Complete'
                    : linkedTaskStatus === 'IN_PROGRESS'
                      ? `Continue: ${linkedTaskTitle?.slice(0, 30) ?? 'Task'}`
                      : `Start: ${linkedTaskTitle?.slice(0, 30) ?? 'Fix this'} →`
                  }
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => {
                  router.push('/dashboard/assessment/risk')
                }}>
                  Review & Update
                </Button>
              )}
            </div>
          </div>
        </div>

        <span className="text-base font-bold text-destructive whitespace-nowrap ml-4">
          -{formatCurrency(dollarImpact)}
        </span>
      </div>
    </div>
  )
}
