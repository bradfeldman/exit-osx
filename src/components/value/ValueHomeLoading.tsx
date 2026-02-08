'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { LoadingMessage } from '@/components/ui/loading-message'

export function ValueHomeLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Hero Metrics: 3 skeleton cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton className="h-[120px] rounded-xl" key={i} />
        ))}
      </div>

      {/* Valuation Bridge */}
      <Skeleton className="h-[280px] rounded-xl" />

      {/* Next Move Card */}
      <Skeleton className="h-[200px] rounded-xl" />

      {/* Value Timeline */}
      <Skeleton className="h-[280px] rounded-xl" />

      <LoadingMessage mode="value" />
    </div>
  )
}
