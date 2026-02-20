'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatPercent, formatCurrency } from '@/lib/valuation/dcf-calculator'
import { Settings2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RISK_FREE_RATE, EQUITY_RISK_PREMIUM, EBITDA_TIERS } from '@/lib/valuation/wacc-defaults'

interface MarketDataPanelProps {
  industryBetaLow?: number
  industryBetaHigh?: number
  industryGrowthLow?: number
  industryGrowthHigh?: number
  ebitdaMultipleLow?: number
  ebitdaMultipleHigh?: number
  industrySource?: string
  // Override props
  ebitdaMultipleLowOverride?: number | null
  ebitdaMultipleHighOverride?: number | null
  onMultipleOverrideChange?: (low: number | null, high: number | null) => void
  // Working capital
  workingCapital?: { t12: number | null; lastFY: number | null; threeYearAvg: number | null } | null
}

// Market data sourced from wacc-defaults.ts (single source of truth)
// Sources: FRED (10Y Treasury), Duff & Phelps / Kroll (ERP), Pepperdine (Size Premium)
const MARKET_DATA = {
  riskFreeRate: RISK_FREE_RATE,
  marketRiskPremium: EQUITY_RISK_PREMIUM,
  sizeRiskPremiumByEbitda: EBITDA_TIERS.filter(t => t.label !== 'Enterprise').map(t => ({
    tier: t.label,
    premium: (t.sizeRiskPremium.low + t.sizeRiskPremium.high) / 2,
  })),
}

// Clean number input component
function MultipleInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="flex-1">
      <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            // Allow empty, numbers, and decimals only
            const val = e.target.value
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              onChange(val)
            }
          }}
          placeholder={placeholder}
          className={cn(
            "w-full h-10 px-3 pr-7 rounded-lg text-sm font-medium",
            "bg-muted/50 border border-border/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "placeholder:text-muted-foreground/50 placeholder:font-normal",
            "transition-all duration-150"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
          x
        </span>
      </div>
    </div>
  )
}

export function MarketDataPanel({
  industryBetaLow = 0.8,
  industryBetaHigh = 1.2,
  industryGrowthLow = 0.02,
  industryGrowthHigh = 0.05,
  ebitdaMultipleLow = 4.0,
  ebitdaMultipleHigh = 8.0,
  industrySource = 'Default industry benchmarks',
  ebitdaMultipleLowOverride,
  ebitdaMultipleHighOverride,
  onMultipleOverrideChange,
  workingCapital,
}: MarketDataPanelProps) {
  const [open, setOpen] = useState(false)
  const [lowInput, setLowInput] = useState('')
  const [highInput, setHighInput] = useState('')

  // Determine which values to display
  const hasOverride = ebitdaMultipleLowOverride != null && ebitdaMultipleHighOverride != null
  const displayLow = hasOverride ? ebitdaMultipleLowOverride : ebitdaMultipleLow
  const displayHigh = hasOverride ? ebitdaMultipleHighOverride : ebitdaMultipleHigh

  // Initialize inputs when popover opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLowInput(ebitdaMultipleLowOverride?.toString() || '')
      setHighInput(ebitdaMultipleHighOverride?.toString() || '')
    }
  }, [open, ebitdaMultipleLowOverride, ebitdaMultipleHighOverride])

  // Validation
  const lowNum = lowInput ? parseFloat(lowInput) : null
  const highNum = highInput ? parseFloat(highInput) : null

  const isLowValid = lowInput === '' || (lowNum !== null && !isNaN(lowNum) && lowNum > 0)
  const isHighValid = highInput === '' || (highNum !== null && !isNaN(highNum) && highNum > 0)
  const isRangeValid = !(lowNum !== null && highNum !== null && highNum <= lowNum)
  const bothFilledOrBothEmpty = (lowInput === '' && highInput === '') || (lowInput !== '' && highInput !== '')

  const canSave = isLowValid && isHighValid && isRangeValid && bothFilledOrBothEmpty

  const handleApply = () => {
    if (!canSave) return

    const low = lowInput ? parseFloat(lowInput) : null
    const high = highInput ? parseFloat(highInput) : null

    onMultipleOverrideChange?.(low, high)
    setOpen(false)
  }

  const handleReset = () => {
    setLowInput('')
    setHighInput('')
    onMultipleOverrideChange?.(null, null)
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Market Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground flex items-center justify-between">
            <span>Market Data</span>
            <span className="text-xs font-normal text-muted-foreground">FRED / Kroll / Pepperdine</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Risk-Free Rate */}
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Risk-Free Rate (10Y Treasury)</span>
              <span className="text-sm font-medium text-foreground">
                {formatPercent(MARKET_DATA.riskFreeRate)}
              </span>
            </div>

            {/* Market Risk Premium */}
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Equity Risk Premium</span>
              <span className="text-sm font-medium text-foreground">
                {formatPercent(MARKET_DATA.marketRiskPremium)}
              </span>
            </div>

            {/* Size Risk Premium */}
            <div className="py-1">
              <span className="text-sm text-muted-foreground block mb-2">Size Risk Premium (by EBITDA)</span>
              <div className="space-y-1 pl-2">
                {MARKET_DATA.sizeRiskPremiumByEbitda.map((tier) => (
                  <div key={tier.tier} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{tier.tier}</span>
                    <span className="font-medium text-foreground">{formatPercent(tier.premium)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Source: wacc-defaults.ts — validated Feb 2026</span>
          </div>
        </CardContent>
      </Card>

      {/* Industry Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground flex items-center justify-between">
            <span>Industry Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Industry Beta */}
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Industry Beta</span>
              <span className="text-sm font-medium text-foreground">
                {industryBetaLow.toFixed(2)} - {industryBetaHigh.toFixed(2)}
              </span>
            </div>

            {/* Industry Growth */}
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Typical Growth Rates</span>
              <span className="text-sm font-medium text-foreground">
                {formatPercent(industryGrowthLow)} - {formatPercent(industryGrowthHigh)}
              </span>
            </div>

            {/* EBITDA Multiples - Interactive Row */}
            {onMultipleOverrideChange ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex justify-between items-center py-2 px-2 -mx-2 rounded-md transition-all duration-150",
                      "hover:bg-muted/50 group cursor-pointer",
                      hasOverride && "bg-primary/5"
                    )}
                  >
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      EBITDA Multiples
                      <Settings2 className={cn(
                        "h-3.5 w-3.5 transition-all duration-150",
                        hasOverride
                          ? "text-primary opacity-100"
                          : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                      )} />
                    </span>
                    <span className={cn(
                      "text-sm font-medium flex items-center gap-2",
                      hasOverride ? "text-primary" : "text-foreground"
                    )}>
                      {hasOverride && (
                        <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wide">
                          Custom
                        </span>
                      )}
                      {displayLow.toFixed(1)}x – {displayHigh.toFixed(1)}x
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-0"
                  sideOffset={8}
                >
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div>
                      <h4 className="font-medium text-sm">Custom Multiple Range</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Industry default: {ebitdaMultipleLow.toFixed(1)}x – {ebitdaMultipleHigh.toFixed(1)}x
                      </p>
                    </div>

                    {/* Inputs */}
                    <div className="flex gap-3">
                      <MultipleInput
                        label="Low"
                        value={lowInput}
                        onChange={setLowInput}
                        placeholder={ebitdaMultipleLow.toFixed(1)}
                      />
                      <MultipleInput
                        label="High"
                        value={highInput}
                        onChange={setHighInput}
                        placeholder={ebitdaMultipleHigh.toFixed(1)}
                      />
                    </div>

                    {/* Validation feedback */}
                    {!isRangeValid && (
                      <p className="text-xs text-red">
                        High must be greater than low
                      </p>
                    )}
                    {!bothFilledOrBothEmpty && (
                      <p className="text-xs text-muted-foreground">
                        Enter both values or leave both empty
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-t">
                    {hasOverride ? (
                      <button
                        onClick={handleReset}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to default
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(false)}
                        className="h-8 px-3 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApply}
                        disabled={!canSave}
                        className="h-8 px-4 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">EBITDA Multiples</span>
                <span className="text-sm font-medium text-foreground">
                  {displayLow.toFixed(1)}x - {displayHigh.toFixed(1)}x
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Source: {hasOverride ? 'Custom' : industrySource}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Working Capital — separate from Industry Benchmarks (QA: was incorrectly grouped) */}
      {workingCapital && (workingCapital.t12 != null || workingCapital.lastFY != null || workingCapital.threeYearAvg != null) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Working Capital
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {workingCapital.t12 != null && (
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-sm text-muted-foreground">Trailing 12 Months</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(workingCapital.t12)}</span>
                </div>
              )}
              {workingCapital.lastFY != null && (
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-sm text-muted-foreground">Last Fiscal Year</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(workingCapital.lastFY)}</span>
                </div>
              )}
              {workingCapital.threeYearAvg != null && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">3-Year Average</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(workingCapital.threeYearAvg)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">AR + Inventory − AP from financial statements</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
