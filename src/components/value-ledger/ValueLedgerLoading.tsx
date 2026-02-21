export function ValueLedgerLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6 animate-pulse">
      {/* Summary bar skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="h-3 w-20 bg-muted rounded mb-2" />
            <div className="h-7 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-8 w-32 bg-muted rounded-lg" />
      </div>
      {/* Timeline skeleton */}
      <div className="space-y-4">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="rounded-xl border border-border p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-8 w-8 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
