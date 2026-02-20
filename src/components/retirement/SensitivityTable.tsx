'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  generateSensitivityTable,
  formatCurrency,
  formatPercent,
  type RetirementAsset,
  type RetirementAssumptions,
} from '@/lib/retirement/retirement-calculator'

interface SensitivityTableProps {
  assets: RetirementAsset[]
  assumptions: RetirementAssumptions
}

export function SensitivityTable({ assets, assumptions }: SensitivityTableProps) {
  // Generate growth rate and spending variations
  const growthRates = useMemo(() => {
    const center = assumptions.growthRate
    return [center - 0.02, center - 0.01, center, center + 0.01, center + 0.02].map((v) =>
      Math.max(0.02, v)
    )
  }, [assumptions.growthRate])

  const spendingLevels = useMemo(() => {
    const center = assumptions.annualSpendingNeeds
    return [
      center * 0.8,
      center * 0.9,
      center,
      center * 1.1,
      center * 1.2,
    ]
  }, [assumptions.annualSpendingNeeds])

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    return generateSensitivityTable(assets, assumptions, growthRates, spendingLevels)
  }, [assets, assumptions, growthRates, spendingLevels])

  // Calculate color based on success rate
  const getCellColor = (successRate: number) => {
    if (successRate >= 100) return 'bg-green-light text-green-dark'
    if (successRate >= 90) return 'bg-green-light/50 text-green-dark'
    if (successRate >= 70) return 'bg-orange-light/50 text-orange-dark'
    if (successRate >= 50) return 'bg-orange-light text-orange-dark'
    return 'bg-red-light text-red-dark'
  }

  const isCenter = (growth: number, spending: number) => {
    return growth === assumptions.growthRate && spending === assumptions.annualSpendingNeeds
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">Sensitivity Analysis</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          How long money lasts by Growth Rate vs Annual Spending
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1.5 text-left text-muted-foreground font-medium">Growth \ Spending</th>
                {spendingLevels.map((spending) => (
                  <th
                    key={spending}
                    className={`p-1.5 text-center font-medium ${
                      spending === assumptions.annualSpendingNeeds
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatCurrency(spending)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {growthRates.map((growth) => (
                <tr key={growth}>
                  <td
                    className={`p-1.5 text-left font-medium ${
                      growth === assumptions.growthRate
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatPercent(growth, 0)}
                  </td>
                  {spendingLevels.map((spending) => {
                    const data = sensitivityData.find(
                      (d) => d.growth === growth && d.spending === spending
                    )
                    const yearsLasts = data?.yearsLasts || 0
                    const successRate = data?.successRate || 0
                    const yearsInRetirement =
                      assumptions.lifeExpectancy - assumptions.retirementAge
                    const displayValue =
                      yearsLasts >= yearsInRetirement + 50 ? '∞' : `${yearsLasts}y`

                    return (
                      <td
                        key={`${growth}-${spending}`}
                        className={`p-1.5 text-center font-medium ${getCellColor(successRate)} ${
                          isCenter(growth, spending) ? 'ring-2 ring-primary ring-inset' : ''
                        }`}
                      >
                        {displayValue}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-light rounded"></div>
              <span>Covered</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-light/50 rounded"></div>
              <span>Marginal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-light rounded"></div>
              <span>Shortfall</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-primary rounded"></div>
            <span>Current</span>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 bg-accent-light rounded-lg">
          <p className="text-xs text-primary">
            <span className="font-medium">Key insight:</span> Each 1% reduction in growth rate
            requires approximately{' '}
            {formatCurrency(
              (assumptions.annualSpendingNeeds * 0.1) / assumptions.growthRate
            )}{' '}
            less annual spending to maintain the same retirement security.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
