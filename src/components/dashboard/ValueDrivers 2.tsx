'use client'

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

export function ValueDrivers({ adjustedEbitda, isEbitdaEstimated, multipleRange, industryName }: ValueDriversProps) {
  const ebitdaLabel = isEbitdaEstimated ? 'Estimated EBITDA' : 'Adjusted EBITDA'
  const ebitdaDescription = isEbitdaEstimated
    ? 'Estimated from your revenue'
    : 'Normalized earnings'

  return (
    <div className="py-8 border-t border-gray-100">
      <div className="grid grid-cols-2 gap-6 md:gap-8">
        {/* EBITDA - Estimated or Adjusted */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {ebitdaLabel}
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-[#3D3D3D]">
            {formatCurrency(adjustedEbitda)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {ebitdaDescription}
          </p>
        </div>

        {/* Industry Multiple */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Industry Multiple Range
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {industryName}
          </p>
          <MultipleRange
            low={multipleRange.low}
            high={multipleRange.high}
            current={multipleRange.current}
          />
        </div>
      </div>
    </div>
  )
}
