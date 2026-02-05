'use client'

import { cn } from '@/lib/utils'

const TIER_STYLES: Record<string, string> = {
  A_TIER: 'text-emerald-600 dark:text-emerald-400',
  B_TIER: 'text-blue-600 dark:text-blue-400',
  C_TIER: 'text-amber-600 dark:text-amber-400',
  D_TIER: 'text-muted-foreground',
}

const TIER_LABELS: Record<string, string> = {
  A_TIER: 'A',
  B_TIER: 'B',
  C_TIER: 'C',
  D_TIER: 'D',
}

interface TierBadgeProps {
  tier: string
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (!TIER_LABELS[tier]) return null

  return (
    <span
      className={cn(
        'text-[10px] font-semibold',
        TIER_STYLES[tier],
        className
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  )
}
