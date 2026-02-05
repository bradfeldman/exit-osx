'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DealRoomLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-border/50 pb-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Pipeline header */}
      <Skeleton className="h-6 w-48" />

      {/* Pipeline columns */}
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-[200px] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
