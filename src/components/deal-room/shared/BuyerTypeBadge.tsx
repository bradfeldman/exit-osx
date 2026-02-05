'use client'

import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<string, string> = {
  STRATEGIC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FINANCIAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INDIVIDUAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MANAGEMENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ESOP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
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
