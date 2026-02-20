'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { TextNumericInput } from '@/components/ui/text-numeric-input'
import {
  type RetirementAssumptions,
  GROWTH_PRESETS,
  formatPercent,
} from '@/lib/retirement/retirement-calculator'

interface GrowthPanelProps {
  assumptions: RetirementAssumptions
  onAssumptionChange: <K extends keyof RetirementAssumptions>(
    key: K,
    value: RetirementAssumptions[K]
  ) => void
  simplified?: boolean
}

export function GrowthPanel({ assumptions, onAssumptionChange, simplified = false }: GrowthPanelProps) {
  const isCustomRate = !GROWTH_PRESETS.some((p) => p.value === assumptions.growthRate)

  if (simplified) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Investment Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Buttons Only */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Choose your risk profile</Label>
            <div className="grid grid-cols-3 gap-2">
              {GROWTH_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onAssumptionChange('growthRate', preset.value)}
                  className={`p-3 text-sm border rounded-lg transition-colors text-center ${
                    assumptions.growthRate === preset.value && !isCustomRate
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border hover:border-border text-foreground'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatPercent(preset.value)}/yr</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">Investment Growth</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preset Buttons */}
        <div className="space-y-2">
          <Label className="text-sm text-foreground">Portfolio Strategy</Label>
          <div className="grid grid-cols-3 gap-2">
            {GROWTH_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onAssumptionChange('growthRate', preset.value)}
                className={`p-3 text-sm border rounded-lg transition-colors text-left ${
                  assumptions.growthRate === preset.value && !isCustomRate
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-border text-foreground'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Rate Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Annual Return Rate</Label>
            <div className="flex items-center gap-1">
              <TextNumericInput
                value={assumptions.growthRate}
                onCommit={(v) => onAssumptionChange('growthRate', v ?? 0.07)}
                multiplier={100}
                decimals={1}
                className="w-16 h-8 text-sm text-right"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
          </div>
          <Slider
            value={assumptions.growthRate}
            onValueChange={(v) => onAssumptionChange('growthRate', v)}
            min={0.02}
            max={0.12}
            step={0.005}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2%</span>
            <span>7% (balanced)</span>
            <span>12%</span>
          </div>
        </div>

        {/* Return Assumptions Info */}
        <div className="p-3 bg-accent-light rounded-lg">
          <p className="text-xs text-primary">
            <span className="font-medium">Note:</span> This is the expected average annual return.
            Actual returns will vary year to year based on market conditions and asset allocation.
          </p>
        </div>

        {/* Real Return Calculation */}
        <div className="p-3 bg-secondary rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nominal Return</span>
            <span className="font-medium">{formatPercent(assumptions.growthRate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Less: Inflation</span>
            <span className="font-medium text-red-dark">-{formatPercent(assumptions.inflationRate)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
            <span className="text-foreground font-medium">Real Return</span>
            <span className="font-bold text-primary">
              {formatPercent(assumptions.growthRate - assumptions.inflationRate)}
            </span>
          </div>
        </div>

        {/* Historical Context */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="font-medium">Historical context:</span>
          </p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>S&P 500 (1926-2024): ~10% nominal</li>
            <li>60/40 portfolio: ~8% nominal</li>
            <li>Bonds only: ~5% nominal</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
