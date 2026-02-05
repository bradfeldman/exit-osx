'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function EvidenceLoading() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-8 space-y-8">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-[280px] rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}
