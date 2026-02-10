'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
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
          <CardTitle className="text-base font-medium text-gray-900">Annual Spending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Annual Spending Only */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm text-gray-700">How much do you spend per year?</Label>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">$</span>
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
          <div className="p-3 bg-gray-50 rounded-lg space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">At retirement (inflation-adjusted)</span>
              <span className="font-medium">{formatCurrency(spendingAtRetirement)}/yr</span>
            </div>
            {annualOtherIncome > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Less: Social Security</span>
                <span className="font-medium text-green-600">-{formatCurrency(annualOtherIncome)}/yr</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200">
              <span className="text-gray-700 font-medium">Portfolio withdrawal needed</span>
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
        <CardTitle className="text-base font-medium text-gray-900">Spending & Income</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Annual Spending */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Annual Spending (today&apos;s $)</Label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">$</span>
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
            min={30000}
            max={300000}
            step={5000}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>$30K</span>
            <span>$150K</span>
            <span>$300K</span>
          </div>
        </div>

        {/* Inflation Rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Inflation Rate</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step={0.1}
                value={(assumptions.inflationRate * 100).toFixed(1)}
                onChange={(e) => onAssumptionChange('inflationRate', Number(e.target.value) / 100)}
                className="w-16 h-8 text-sm text-right"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
          <Slider
            value={assumptions.inflationRate}
            onValueChange={(v) => onAssumptionChange('inflationRate', v)}
            min={0.01}
            max={0.06}
            step={0.005}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1%</span>
            <span>Avg: 3%</span>
            <span>6%</span>
          </div>
        </div>

        {/* Social Security */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Social Security (monthly)</Label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">$</span>
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
          <div className="flex justify-between text-xs text-gray-400">
            <span>$0</span>
            <span>Avg: $1,900</span>
            <span>$5,000</span>
          </div>
        </div>

        {/* Other Monthly Income */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Other Income (monthly)</Label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">$</span>
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
          <p className="text-xs text-gray-500">Pension, rental income, part-time work, etc.</p>
        </div>

        {/* Summary */}
        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Spending at retirement (inflation adj.)</span>
            <span className="font-medium">{formatCurrency(spendingAtRetirement)}/yr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Other income in retirement</span>
            <span className="font-medium text-green-600">{formatCurrency(annualOtherIncome)}/yr</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-700 font-medium">Portfolio withdrawal needed</span>
            <span className="font-bold text-primary">
              {formatCurrency(Math.max(0, spendingAtRetirement - annualOtherIncome))}/yr
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
