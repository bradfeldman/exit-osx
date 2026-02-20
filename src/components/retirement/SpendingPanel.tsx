'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { TextNumericInput } from '@/components/ui/text-numeric-input'
import {
  type RetirementAssumptions,
  formatCurrency,
  formatInputValue,
  parseInputValue,
} from '@/lib/retirement/retirement-calculator'

interface SpendingPanelProps {
  assumptions: RetirementAssumptions
  onAssumptionChange: <K extends keyof RetirementAssumptions>(
    key: K,
    value: RetirementAssumptions[K]
  ) => void
  spendingAtRetirement: number
  annualOtherIncome: number
  simplified?: boolean
}

export function SpendingPanel({
  assumptions,
  onAssumptionChange,
  spendingAtRetirement,
  annualOtherIncome,
  simplified = false,
}: SpendingPanelProps) {
  if (simplified) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Annual Spending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Annual Spending Only */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm text-foreground">How much do you spend per year?</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(assumptions.annualSpendingNeeds)}
                  onChange={(e) =>
                    onAssumptionChange('annualSpendingNeeds', parseInputValue(e.target.value))
                  }
                  className="w-28 h-8 text-sm text-right"
                />
              </div>
            </div>
          </div>

          {/* Simple Summary */}
          <div className="p-3 bg-secondary rounded-lg space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">At retirement (inflation-adjusted)</span>
              <span className="font-medium">{formatCurrency(spendingAtRetirement)}/yr</span>
            </div>
            {annualOtherIncome > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Less: Social Security</span>
                <span className="font-medium text-green-dark">-{formatCurrency(annualOtherIncome)}/yr</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-1.5 border-t border-border">
              <span className="text-foreground font-medium">Portfolio withdrawal needed</span>
              <span className="font-bold text-primary">
                {formatCurrency(Math.max(0, spendingAtRetirement - annualOtherIncome))}/yr
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">Spending & Income</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Annual Spending */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Annual Spending (today&apos;s $)</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatInputValue(assumptions.annualSpendingNeeds)}
                onChange={(e) =>
                  onAssumptionChange('annualSpendingNeeds', parseInputValue(e.target.value))
                }
                className="w-28 h-8 text-sm text-right"
              />
            </div>
          </div>
          <Slider
            value={assumptions.annualSpendingNeeds}
            onValueChange={(v) => onAssumptionChange('annualSpendingNeeds', v)}
            min={100000}
            max={1000000}
            step={10000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$100K</span>
            <span>$500K</span>
            <span>$1M</span>
          </div>
        </div>

        {/* Inflation Rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Inflation Rate</Label>
            <div className="flex items-center gap-1">
              <TextNumericInput
                value={assumptions.inflationRate}
                onCommit={(v) => onAssumptionChange('inflationRate', v ?? 0.03)}
                multiplier={100}
                decimals={1}
                className="w-16 h-8 text-sm text-right"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
          </div>
          <Slider
            value={assumptions.inflationRate}
            onValueChange={(v) => onAssumptionChange('inflationRate', v)}
            min={0.01}
            max={0.06}
            step={0.005}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1%</span>
            <span>Avg: 3%</span>
            <span>6%</span>
          </div>
        </div>

        {/* Social Security */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Social Security (monthly)</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatInputValue(assumptions.socialSecurityMonthly)}
                onChange={(e) =>
                  onAssumptionChange('socialSecurityMonthly', parseInputValue(e.target.value))
                }
                className="w-24 h-8 text-sm text-right"
              />
            </div>
          </div>
          <Slider
            value={assumptions.socialSecurityMonthly}
            onValueChange={(v) => onAssumptionChange('socialSecurityMonthly', v)}
            min={0}
            max={5000}
            step={100}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>Avg: $1,900</span>
            <span>$5,000</span>
          </div>
        </div>

        {/* Other Monthly Income */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Other Income (monthly)</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatInputValue(assumptions.otherIncomeMonthly)}
                onChange={(e) =>
                  onAssumptionChange('otherIncomeMonthly', parseInputValue(e.target.value))
                }
                className="w-24 h-8 text-sm text-right"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Pension, rental income, part-time work, etc.</p>
        </div>

        {/* Summary */}
        <div className="p-3 bg-secondary rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Spending at retirement (inflation adj.)</span>
            <span className="font-medium">{formatCurrency(spendingAtRetirement)}/yr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Other income in retirement</span>
            <span className="font-medium text-green-dark">{formatCurrency(annualOtherIncome)}/yr</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-foreground font-medium">Portfolio withdrawal needed</span>
            <span className="font-bold text-primary">
              {formatCurrency(Math.max(0, spendingAtRetirement - annualOtherIncome))}/yr
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
