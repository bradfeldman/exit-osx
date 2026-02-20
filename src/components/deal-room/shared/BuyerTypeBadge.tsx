'use client'

import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<string, string> = {
  STRATEGIC: 'bg-accent-light text-primary dark:bg-primary/30 dark:text-primary',
  FINANCIAL: 'bg-purple-light text-purple-dark dark:bg-purple-dark/30 dark:text-purple',
  INDIVIDUAL: 'bg-orange-light text-orange-dark dark:bg-orange-dark/30 dark:text-orange',
  MANAGEMENT: 'bg-teal-light text-teal dark:bg-teal/30 dark:text-teal',
  ESOP: 'bg-green-light text-green-dark dark:bg-green-dark/30 dark:text-green',
  OTHER: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground',
}

const TYPE_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  FINANCIAL: 'Financial',
  INDIVIDUAL: 'Individual',
  MANAGEMENT: 'Management',
  ESOP: 'ESOP',
  OTHER: 'Other',
}

interface BuyerTypeBadgeProps {
  type: string
  className?: string
}

export function BuyerTypeBadge({ type, className }: BuyerTypeBadgeProps) {
  return (
    <span
      className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
        TYPE_STYLES[type] ?? TYPE_STYLES.OTHER,
        className
      )}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}
