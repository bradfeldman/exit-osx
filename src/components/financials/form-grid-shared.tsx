'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────
export interface FinancialPeriod {
  id: string
  label: string
  fiscalYear: number
  periodType: string
}

// ─── Format helpers ───────────────────────────────────────────────
export function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

export function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Grid components ──────────────────────────────────────────────

/** Editable currency input cell */
export function GridInput({
  value,
  onChange,
  periodId,
  field,
}: {
  value: number
  onChange: (periodId: string, field: string, value: number) => void
  periodId: string
  field: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        type="text"
        inputMode="numeric"
        value={formatInputValue(value)}
        onChange={(e) => onChange(periodId, field, parseInputValue(e.target.value))}
        className="pl-7 h-9 text-sm font-medium bg-secondary border-border focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-right"
        placeholder="0"
      />
    </div>
  )
}

/** Read-only calculated value cell */
export function CalcCell({
  value,
  format,
  highlight,
  colorClass,
}: {
  value: number
  format: 'currency' | 'percent'
  highlight?: boolean
  colorClass?: string
}) {
  const formatted = format === 'currency' ? formatCurrency(value) : formatPercent(value)
  return (
    <div className={cn(
      'h-9 flex items-center justify-end px-3 text-sm font-semibold rounded',
      colorClass
        ? colorClass
        : highlight
          ? 'bg-accent-light text-primary'
          : 'bg-secondary text-foreground'
    )}>
      {formatted}
    </div>
  )
}

/** Section header with icon badge + label */
export function SectionHeader({
  icon: Icon,
  label,
  bgColor,
  textColor,
}: {
  icon: LucideIcon
  label: string
  bgColor: string
  textColor: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex items-center justify-center w-6 h-6 rounded-full', bgColor, textColor)}>
        <Icon className="h-3 w-3" />
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

/** Standard row: label + one cell per period */
export function FormRow({
  label,
  periods,
  children,
}: {
  label: string
  periods: FinancialPeriod[]
  children: (period: FinancialPeriod) => React.ReactNode
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}
    >
      <div className="flex items-center pl-8">
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      {periods.map((period) => (
        <div key={period.id}>{children(period)}</div>
      ))}
    </div>
  )
}

/** Column headers row (period labels) */
export function PeriodHeaders({ periods }: { periods: FinancialPeriod[] }) {
  return (
    <div
      className="grid gap-3 mb-4"
      style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}
    >
      <div /> {/* Label spacer */}
      {periods.map((period) => (
        <div key={period.id} className="text-center">
          <span className="text-sm font-semibold text-foreground">{period.label}</span>
        </div>
      ))}
    </div>
  )
}
