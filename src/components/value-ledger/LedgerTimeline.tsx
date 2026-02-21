'use client'

import { LedgerEntry } from './LedgerEntry'

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

interface LedgerTimelineProps {
  entries: LedgerEntryData[]
}

function groupByDate(entries: LedgerEntryData[]): Map<string, LedgerEntryData[]> {
  const groups = new Map<string, LedgerEntryData[]>()

  for (const entry of entries) {
    const date = new Date(entry.occurredAt)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }

  return groups
}

export function LedgerTimeline({ entries }: LedgerTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground text-sm">No ledger entries yet.</p>
        <p className="text-muted-foreground text-xs mt-1">
          Complete tasks and connect data to start building your value story.
        </p>
      </div>
    )
  }

  const groups = groupByDate(entries)

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([dateLabel, dateEntries]) => (
        <div key={dateLabel}>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {dateLabel}
          </h4>
          <div className="rounded-xl border border-border bg-card px-4">
            {dateEntries.map((entry) => (
              <LedgerEntry key={entry.id} entry={entry} mode="full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
