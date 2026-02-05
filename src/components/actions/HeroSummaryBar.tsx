'use client'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

interface HeroSummaryBarProps {
  totalTasks: number
  activeTasks: number
  deferredTasks: number
  completedThisMonth: number
  valueRecoveredThisMonth: number
}

export function HeroSummaryBar({
  totalTasks,
  activeTasks,
  deferredTasks,
  completedThisMonth,
  valueRecoveredThisMonth,
}: HeroSummaryBarProps) {
  const statsSegments = [`${totalTasks} tasks`, `${activeTasks} active`]
  if (deferredTasks > 0) {
    statsSegments.push(`${deferredTasks} deferred`)
  }

  return (
    <div className="w-full rounded-xl border border-border/50 bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            YOUR ACTION QUEUE
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {statsSegments.map((seg, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {seg.includes('deferred') ? (
                  <span className="text-amber-600 cursor-pointer">{seg}</span>
                ) : (
                  seg
                )}
              </span>
            ))}
          </p>
        </div>

        <div className="text-sm text-muted-foreground sm:text-right">
          {completedThisMonth > 0 ? (
            <p>
              <span>This Month: </span>
              <span className="font-semibold text-foreground">
                {completedThisMonth} completed
              </span>
              <span> · </span>
              <span className="font-bold text-[var(--burnt-orange)]">
                {formatCurrency(valueRecoveredThisMonth)} recovered
              </span>
            </p>
          ) : (
            <p>This Month: Ready to start</p>
          )}
        </div>
      </div>
    </div>
  )
}
