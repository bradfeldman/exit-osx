'use client'

import { cn } from '@/lib/utils'

const TIER_STYLES: Record<string, string> = {
  A_TIER: 'text-green-dark dark:text-green',
  B_TIER: 'text-primary dark:text-primary',
  C_TIER: 'text-orange-dark dark:text-orange',
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
