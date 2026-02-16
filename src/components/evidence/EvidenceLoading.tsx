'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { LoadingMessage } from '@/components/ui/loading-message'

export function EvidenceLoading() {
  return (
    <div className="max-w-[960px] mx-auto px-6 py-8 space-y-6">
      {/* ReadinessHeader skeleton */}
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <Skeleton className="h-3 w-40 mb-6" />
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-shrink-0 flex flex-col items-center lg:items-start">
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <Skeleton className="h-3 w-16 mt-2" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* CategoryNav skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Document shelf skeleton (2 categories) */}
      {Array.from({ length: 2 }).map((_, catIndex) => (
        <div key={catIndex} className="space-y-4">
          <div className="flex items-center gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ))}

      <LoadingMessage mode="evidence" />
    </div>
  )
}
