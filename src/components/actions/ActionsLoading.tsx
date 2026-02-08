'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { LoadingMessage } from '@/components/ui/loading-message'

export function ActionsLoading() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-8 space-y-6">
      {/* Hero bar */}
      <Skeleton className="h-16 rounded-xl" />

      {/* Active task card */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Up Next */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>

      <LoadingMessage mode="actions" />
    </div>
  )
}
