'use client'

import { motion } from '@/lib/motion'
import { MultipleRange } from '@/components/ui/multiple-range'

interface ValueDriversProps {
  adjustedEbitda: number
  isEbitdaEstimated: boolean
  multipleRange: {
    low: number
    high: number
    current: number | null
  }
  industryName: string
  onMultipleDragChange?: (multiple: number) => void
  onMultipleDragEnd?: () => void
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

export function ValueDrivers({ adjustedEbitda, isEbitdaEstimated, multipleRange, industryName, onMultipleDragChange, onMultipleDragEnd }: ValueDriversProps) {
  const ebitdaLabel = isEbitdaEstimated ? 'Estimated EBITDA' : 'Adjusted EBITDA'
  const ebitdaDescription = isEbitdaEstimated
    ? 'Estimated from your revenue'
    : 'Normalized earnings'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative py-8 border-t border-border"
    >
      <div className="grid grid-cols-2 gap-6 md:gap-8">
        {/* EBITDA - Estimated or Adjusted */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="relative p-5 bg-gradient-to-br from-muted/50 to-transparent rounded-xl border border-border/50"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {ebitdaLabel}
          </p>
          <p className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {formatCurrency(adjustedEbitda)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {ebitdaDescription}
          </p>

          {/* Decorative element */}
          <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </motion.div>

        {/* Industry Multiple */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="relative p-5 bg-gradient-to-br from-muted/50 to-transparent rounded-xl border border-border/50"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Industry Multiple Range
              </p>
              <p className="text-xs text-muted-foreground">
                {industryName}
              </p>
            </div>
            {/* Decorative element */}
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
          </div>
          <MultipleRange
            low={multipleRange.low}
            high={multipleRange.high}
            current={multipleRange.current}
            onDragChange={onMultipleDragChange}
            onDragEnd={onMultipleDragEnd}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
