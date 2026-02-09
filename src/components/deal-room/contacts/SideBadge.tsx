'use client'

import { cn } from '@/lib/utils'

const SIDE_STYLES: Record<string, string> = {
  BUYER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SELLER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NEUTRAL: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
}

const SIDE_LABELS: Record<string, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  NEUTRAL: 'Neutral',
}

interface SideBadgeProps {
  side: string
  className?: string
}

export function SideBadge({ side, className }: SideBadgeProps) {
  return (
    <span
      className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
        SIDE_STYLES[side] ?? SIDE_STYLES.NEUTRAL,
        className
      )}
    >
      {SIDE_LABELS[side] ?? side}
    </span>
  )
}
