'use client'

import Link from 'next/link'

interface Signal {
  id: string
  title: string
  severity: string
  category: string | null
  createdAt: string
  estimatedValueImpact: number | null
}

interface SignalSummaryCardProps {
  signals: Signal[]
}

function getSignalDotColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-red-500'
    case 'MEDIUM':
      return 'bg-orange-500'
    case 'LOW':
      return 'bg-emerald-500'
    default:
      return 'bg-muted-foreground'
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SignalSummaryCard({ signals }: SignalSummaryCardProps) {
  if (signals.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Recent Signals
        </p>
        <p className="text-sm text-muted-foreground/70">
          No signals yet. Signals appear as your business data changes or new risks are detected.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Recent Signals
      </p>
      <div className="flex flex-col gap-3">
        {signals.map((signal) => (
          <Link
            key={signal.id}
            href={`/dashboard/signals`}
            className="flex items-start gap-2.5 group no-underline"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${getSignalDotColor(signal.severity)}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-foreground leading-snug">
                <span className="font-semibold group-hover:text-primary transition-colors">{signal.title}</span>
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                {formatRelativeTime(signal.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
