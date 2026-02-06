export function ValueLedgerLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6 animate-pulse">
      {/* Summary bar skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-100 p-4">
            <div className="h-3 w-20 bg-zinc-200 rounded mb-2" />
            <div className="h-7 w-24 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-8 w-32 bg-zinc-200 rounded-lg" />
        <div className="h-8 w-32 bg-zinc-200 rounded-lg" />
      </div>
      {/* Timeline skeleton */}
      <div className="space-y-4">
        <div className="h-3 w-16 bg-zinc-200 rounded" />
        <div className="rounded-xl border border-zinc-100 p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-8 w-8 bg-zinc-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 rounded w-1/3" />
              </div>
              <div className="h-4 w-16 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
