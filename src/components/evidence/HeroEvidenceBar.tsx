'use client'

import { useCountUpScore } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

interface HeroEvidenceBarProps {
  percentage: number
  documentsUploaded: number
  documentsExpected: number
  lastUploadAt: string | null
}

function getBarColor(percentage: number): string {
  if (percentage >= 67) return 'bg-emerald-500'
  if (percentage >= 34) return 'bg-amber-500'
  return 'bg-rose-500'
}

export function HeroEvidenceBar({
  percentage,
  documentsUploaded,
  documentsExpected,
  lastUploadAt,
}: HeroEvidenceBarProps) {
  const { value: animatedScore } = useCountUpScore(percentage)

  const lastUploadLabel = lastUploadAt
    ? `Last upload: ${new Date(lastUploadAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null

  return (
    <div className="w-full rounded-xl border border-border/50 bg-card p-6">
      {/* Title + Score */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          YOUR EVIDENCE
        </span>
        <span className="text-lg font-bold text-[var(--burnt-orange)]">
          {animatedScore}% buyer-ready
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', getBarColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {documentsUploaded > 0
            ? `${documentsUploaded} documents · 6 categories`
            : 'Start building buyer-ready evidence'}
        </span>
        {lastUploadLabel && <span>{lastUploadLabel}</span>}
      </div>
    </div>
  )
}
