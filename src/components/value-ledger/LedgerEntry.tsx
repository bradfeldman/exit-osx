'use client'

import { DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { formatDollar } from '@/lib/utils/currency'

interface LedgerEntryData {
  id: string
  eventType: string
  category: string | null
  deltaValueRecovered: number
  deltaValueAtRisk: number
  deltaBri: number | null
  narrativeSummary: string
  occurredAt: string
  taskId: string | null
  signalId: string | null
}

interface LedgerEntryProps {
  entry: LedgerEntryData
  mode?: 'compact' | 'full'
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EVENT_ICONS: Record<string, typeof CheckCircle> = {
  TASK_COMPLETED: CheckCircle,
  DRIFT_DETECTED: AlertTriangle,
  SIGNAL_CONFIRMED: TrendingUp,
  REGRESSION_DETECTED: TrendingDown,
  ASSESSMENT_COMPLETED: TrendingUp,
  SNAPSHOT_CREATED: Clock,
  BENCHMARK_SHIFT: DollarSign,
  NEW_DATA_CONNECTED: TrendingUp,
}

export function LedgerEntry({ entry, mode = 'compact' }: LedgerEntryProps) {
  const isRecovered = entry.deltaValueRecovered > 0
  const isAtRisk = entry.deltaValueAtRisk > 0
  const barColor = isRecovered ? 'bg-green' : isAtRisk ? 'bg-orange' : 'bg-border'
  const amount = isRecovered ? entry.deltaValueRecovered : entry.deltaValueAtRisk
  const amountColor = isRecovered ? 'text-green-dark' : isAtRisk ? 'text-orange-dark' : 'text-muted-foreground'
  const Icon = EVENT_ICONS[entry.eventType] ?? DollarSign

  if (mode === 'compact') {
    return (
      <div className="flex items-start gap-3 py-2.5">
        <div className={`w-0.5 self-stretch rounded-full ${barColor}`} />
        <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${amountColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug truncate">
            {entry.narrativeSummary}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatRelativeTime(entry.occurredAt)}
          </p>
        </div>
        {amount > 0 && (
          <span className={`text-sm font-medium tabular-nums ${amountColor}`}>
            {isRecovered ? '+' : '-'}{formatDollar(amount)}
          </span>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <div className={`w-1 self-stretch rounded-full ${barColor}`} />
      <div className="flex-shrink-0 mt-0.5">
        <div className={`p-2 rounded-lg ${isRecovered ? 'bg-green-light' : isAtRisk ? 'bg-orange-light' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${amountColor}`} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          {entry.narrativeSummary}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {entry.category && (
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {entry.category.replace('_', ' & ')}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(entry.occurredAt)}
          </span>
          {entry.deltaBri != null && entry.deltaBri !== 0 && (
            <span className={`text-xs font-medium ${entry.deltaBri > 0 ? 'text-green-dark' : 'text-red'}`}>
              BRI {entry.deltaBri > 0 ? '+' : ''}{(entry.deltaBri * 100).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {amount > 0 && (
        <div className="text-right flex-shrink-0">
          <span className={`text-sm font-semibold tabular-nums ${amountColor}`}>
            {isRecovered ? '+' : '-'}{formatDollar(amount)}
          </span>
        </div>
      )}
    </div>
  )
}
