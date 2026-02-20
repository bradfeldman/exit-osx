'use client'

import { cn } from '@/lib/utils'

const SIDE_STYLES: Record<string, string> = {
  BUYER: 'bg-accent-light text-primary dark:bg-primary/30 dark:text-primary',
  SELLER: 'bg-green-light text-green-dark dark:bg-green-dark/30 dark:text-green',
  NEUTRAL: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground',
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
