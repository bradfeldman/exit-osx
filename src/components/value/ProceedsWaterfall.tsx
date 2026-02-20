'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Lock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import {
  calculateProceeds,
  US_STATE_TAX_RATES,
  DEFAULT_TRANSACTION_COST_RATE,
  type EntityType,
} from '@/lib/proceeds/proceeds-calculator'

const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'C_CORP', label: 'C-Corporation' },
  { value: 'S_CORP', label: 'S-Corporation' },
  { value: 'LLC', label: 'LLC' },
  { value: 'SOLE_PROP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
]

function fmt(value: number, negative = false): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(value))
  return negative && value > 0 ? `(${formatted})` : formatted
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

interface ProceedsWaterfallProps {
  isFreeUser?: boolean
  onUpgrade?: () => void
  proceedsInputs?: {
    currentValue: number
    netDebt: number
    ownershipPercent: number
    entityType: string | null
  } | null
}

export function ProceedsWaterfall({
  isFreeUser = false,
  onUpgrade,
  proceedsInputs,
}: ProceedsWaterfallProps) {
  // Local interactive state
  const [entityType, setEntityType] = useState<EntityType>(
    (proceedsInputs?.entityType as EntityType) || 'LLC'
  )
  const [stateCode, setStateCode] = useState('CA')
  const [transactionCostRate, setTransactionCostRate] = useState(
    DEFAULT_TRANSACTION_COST_RATE * 100 // display as percentage
  )
  const [isQSBS, setIsQSBS] = useState(false)
  const [showTaxDetail, setShowTaxDetail] = useState(false)

  const waterfall = useMemo(() => {
    if (!proceedsInputs || proceedsInputs.currentValue <= 0) return null
    return calculateProceeds({
      enterpriseValue: proceedsInputs.currentValue,
      netDebt: proceedsInputs.netDebt,
      ownershipPercent: proceedsInputs.ownershipPercent,
      transactionCostRate: transactionCostRate / 100,
      entityType,
      stateCode,
      isQSBS: entityType === 'C_CORP' && isQSBS,
      costBasis: 0,
    })
  }, [proceedsInputs, entityType, stateCode, transactionCostRate, isQSBS])

  // Locked state for free users
  if (isFreeUser) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Upgrade to see your estimated take-home proceeds
          </p>
          <p className="text-xs text-muted-foreground/60 mb-3">
            See what you actually keep after taxes, debt, and transaction costs
          </p>
          {onUpgrade && (
            <Button size="sm" variant="outline" onClick={onUpgrade}>
              See Net Proceeds
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (!waterfall || !proceedsInputs || proceedsInputs.currentValue <= 0) {
    return null
  }

  const stateEntry = US_STATE_TAX_RATES.find(s => s.code === stateCode)
  const stateName = stateEntry?.name ?? stateCode

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estimated Net Proceeds</CardTitle>
        <CardDescription>
          What you could take home after taxes, debt, and transaction costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Type</Label>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); if (v !== 'C_CORP') setIsQSBS(false) }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tax State</Label>
            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_STATE_TAX_RATES.map(s => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    {s.code} - {s.name} ({(s.rate * 100).toFixed(1)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Transaction Costs %</Label>
            <Input
              type="number"
              value={transactionCostRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 0 && val <= 25) setTransactionCostRate(val)
              }}
              className="h-8 text-xs"
              min={0}
              max={25}
              step={0.5}
            />
          </div>
          {entityType === 'C_CORP' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">QSBS Eligible</Label>
              <button
                type="button"
                onClick={() => setIsQSBS(!isQSBS)}
                className={`flex items-center gap-2 h-8 px-3 rounded-md border text-xs w-full transition-colors ${
                  isQSBS
                    ? 'bg-green-light border-green/20 text-green-dark dark:bg-green-dark/30 dark:border-green-dark dark:text-green'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  isQSBS ? 'bg-green border-green' : 'border-muted-foreground/30'
                }`}>
                  {isQSBS && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                {isQSBS ? 'Yes' : 'No'}
              </button>
            </div>
          )}
        </div>

        {/* Waterfall Statement */}
        <div className="font-mono text-sm space-y-0">
          <WaterfallRow label="Enterprise Value" value={fmt(waterfall.enterpriseValue)} bold />
          <WaterfallRow label="Less: Net Debt" value={fmt(waterfall.lessNetDebt, true)} indent />
          <WaterfallRow label="Equity Value" value={fmt(waterfall.equityValue)} bold border />
          <WaterfallRow
            label={`Your Ownership (${proceedsInputs.ownershipPercent}%)`}
            value={fmt(waterfall.ownerShare)}
            indent
          />
          <WaterfallRow
            label={`Less: Transaction Costs (${pct(transactionCostRate / 100)})`}
            value={fmt(waterfall.lessTransactionCosts, true)}
            indent
          />
          <WaterfallRow label="Pre-Tax Proceeds" value={fmt(waterfall.preTaxProceeds)} bold border />

          {/* Tax summary / detail toggle */}
          <button
            type="button"
            onClick={() => setShowTaxDetail(!showTaxDetail)}
            className="w-full"
          >
            <div className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
              <span className="flex items-center gap-1 text-muted-foreground">
                Estimated Taxes ({pct(waterfall.effectiveTaxRate)})
                {showTaxDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </span>
              <span className="text-destructive/80">{fmt(waterfall.totalTax, true)}</span>
            </div>
          </button>
          {showTaxDetail && (
            <div className="pl-4 space-y-0">
              {waterfall.corporateTax > 0 && (
                <WaterfallRow
                  label="Corporate Tax (21%)"
                  value={fmt(waterfall.corporateTax, true)}
                  muted
                />
              )}
              <WaterfallRow
                label="Federal LTCG (20%)"
                value={fmt(waterfall.capitalGainsTax, true)}
                muted
              />
              <WaterfallRow
                label="NIIT (3.8%)"
                value={fmt(waterfall.niitTax, true)}
                muted
              />
              <WaterfallRow
                label={`State - ${stateName} (${pct(stateEntry?.rate ?? 0)})`}
                value={fmt(waterfall.stateTax, true)}
                muted
              />
              {waterfall.qsbsExclusion > 0 && (
                <WaterfallRow
                  label="QSBS Exclusion"
                  value={fmt(waterfall.qsbsExclusion)}
                  className="text-green-dark dark:text-green"
                />
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border my-1" />

          {/* Net Proceeds */}
          <div className="flex justify-between items-center py-2 px-2">
            <span className="font-semibold text-foreground">Estimated Net Proceeds</span>
            <span className="font-bold text-lg text-green-dark dark:text-green">
              {fmt(waterfall.netProceeds)}
            </span>
          </div>
        </div>

        {/* C-Corp note */}
        {entityType === 'C_CORP' && !isQSBS && (
          <p className="text-xs text-orange-dark dark:text-orange bg-orange-light dark:bg-orange-dark/30 px-3 py-2 rounded-md">
            C-Corp asset sale assumes double taxation (corporate + personal). Stock sales may have different tax treatment.
          </p>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground/60 italic">
          Estimated proceeds based on simplified assumptions. Cost basis defaults to $0 (conservative).
          Consult a tax advisor for your specific situation.
        </p>
      </CardContent>
    </Card>
  )
}

function WaterfallRow({
  label,
  value,
  bold,
  indent,
  border,
  muted,
  className,
}: {
  label: string
  value: string
  bold?: boolean
  indent?: boolean
  border?: boolean
  muted?: boolean
  className?: string
}) {
  return (
    <div
      className={`flex justify-between items-center py-1 px-2 ${
        border ? 'border-t border-border' : ''
      } ${className ?? ''}`}
    >
      <span
        className={`${bold ? 'font-semibold text-foreground' : ''} ${
          indent ? 'pl-2' : ''
        } ${muted ? 'text-muted-foreground text-xs' : ''}`}
      >
        {label}
      </span>
      <span className={bold ? 'font-semibold' : muted ? 'text-muted-foreground text-xs' : ''}>
        {value}
      </span>
    </div>
  )
}
