'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DiagnosisLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-7 w-[240px]" />
          <Skeleton className="h-4 w-[200px] mt-2" />
        </div>
        <Skeleton className="h-14 w-[80px]" />
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton className="h-[180px] rounded-xl" key={i} />
        ))}
      </div>

      {/* Risk drivers */}
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  )
}
