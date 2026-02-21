'use client'

import { Filter } from 'lucide-react'

interface LedgerFiltersProps {
  selectedCategory: string | null
  selectedEventType: string | null
  onCategoryChange: (category: string | null) => void
  onEventTypeChange: (eventType: string | null) => void
}

const CATEGORIES = [
  { value: null, label: 'All Categories' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'TRANSFERABILITY', label: 'Transferability' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'MARKET', label: 'Market' },
  { value: 'LEGAL_TAX', label: 'Legal & Tax' },
  { value: 'PERSONAL', label: 'Personal' },
]

const EVENT_TYPES = [
  { value: null, label: 'All Events' },
  { value: 'TASK_COMPLETED', label: 'Tasks Completed' },
  { value: 'DRIFT_DETECTED', label: 'Drift Detected' },
  { value: 'SIGNAL_CONFIRMED', label: 'Signals Confirmed' },
  { value: 'ASSESSMENT_COMPLETED', label: 'Assessments' },
  { value: 'REGRESSION_DETECTED', label: 'Regressions' },
]

export function LedgerFilters({
  selectedCategory,
  selectedEventType,
  onCategoryChange,
  onEventTypeChange,
}: LedgerFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <select
        value={selectedCategory ?? ''}
        onChange={(e) => onCategoryChange(e.target.value || null)}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value ?? 'all'} value={c.value ?? ''}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={selectedEventType ?? ''}
        onChange={(e) => onEventTypeChange(e.target.value || null)}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {EVENT_TYPES.map((e) => (
          <option key={e.value ?? 'all'} value={e.value ?? ''}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  )
}
