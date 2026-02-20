'use client'

import { useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateSensitivityTable, formatCurrency, formatPercent, type DCFInputs } from '@/lib/valuation/dcf-calculator'
import { analytics } from '@/lib/analytics'

interface SensitivityTableProps {
  baseInputs: DCFInputs
  centerWACC: number
  centerTerminalGrowth: number
  finalEBITDA?: number
}

export function SensitivityTable({
  baseInputs,
  centerWACC,
  centerTerminalGrowth,
  finalEBITDA,
}: SensitivityTableProps) {
  // Generate WACC and terminal growth values centered around current values
  const waccValues = useMemo(() => {
    const step = 0.01 // 1% steps
    return [
      centerWACC - 2 * step,
      centerWACC - step,
      centerWACC,
      centerWACC + step,
      centerWACC + 2 * step,
    ].map((v) => Math.max(0.05, v)) // Ensure WACC is at least 5%
  }, [centerWACC])

  const terminalGrowthValues = useMemo(() => {
    const step = 0.005 // 0.5% steps
    return [
      centerTerminalGrowth - 2 * step,
      centerTerminalGrowth - step,
      centerTerminalGrowth,
      centerTerminalGrowth + step,
      centerTerminalGrowth + 2 * step,
    ].map((v) => Math.max(0.005, v)) // Ensure growth is at least 0.5%
  }, [centerTerminalGrowth])

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    return generateSensitivityTable(baseInputs, waccValues, terminalGrowthValues, finalEBITDA)
  }, [baseInputs, waccValues, terminalGrowthValues, finalEBITDA])

  // Find min and max for color scaling
  const validValues = sensitivityData.filter((d) => d.enterpriseValue > 0).map((d) => d.enterpriseValue)

  const centerValue = sensitivityData.find(
    (d) => d.wacc === centerWACC && d.growth === centerTerminalGrowth
  )?.enterpriseValue || 0

  // Track when sensitivity table is viewed with valid data
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || centerValue <= 0) return
    hasTrackedView.current = true

    analytics.track('sensitivity_table_viewed', {
      centerWacc: centerWACC,
      centerGrowth: centerTerminalGrowth,
      baseValue: centerValue,
    })
  }, [centerValue, centerWACC, centerTerminalGrowth])

  if (validValues.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">
            Sensitivity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Enter Base Free Cash Flow to see sensitivity analysis
          </p>
        </CardContent>
      </Card>
    )
  }

  const minValue = Math.min(...validValues)
  const maxValue = Math.max(...validValues)

  // Calculate color for cell based on value relative to center
  const getCellColor = (value: number) => {
    if (value === 0) return 'bg-secondary text-muted-foreground'

    const range = maxValue - minValue
    if (range === 0) return 'bg-secondary'

    const normalized = (value - minValue) / range

    // Use a gradient from red (low) to green (high)
    if (normalized >= 0.7) {
      return 'bg-green-light text-green-dark'
    } else if (normalized >= 0.5) {
      return 'bg-green-light/50 text-green-dark'
    } else if (normalized >= 0.3) {
      return 'bg-orange-light/50 text-orange-dark'
    } else if (normalized >= 0.15) {
      return 'bg-orange-light text-orange-dark'
    } else {
      return 'bg-red-light text-red-dark'
    }
  }

  // Check if this is the center cell
  const isCenterCell = (wacc: number, growth: number) => {
    return wacc === centerWACC && growth === centerTerminalGrowth
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">
          Sensitivity Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Enterprise Value by WACC vs Terminal Growth Rate
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs text-muted-foreground font-medium">
                  WACC \ Terminal Growth
                </th>
                {terminalGrowthValues.map((growth) => (
                  <th
                    key={growth}
                    className={`p-2 text-center text-xs font-medium ${
                      growth === centerTerminalGrowth
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatPercent(growth, 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waccValues.map((wacc) => (
                <tr key={wacc}>
                  <td
                    className={`p-2 text-left text-xs font-medium ${
                      wacc === centerWACC ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {formatPercent(wacc, 1)}
                  </td>
                  {terminalGrowthValues.map((growth) => {
                    const data = sensitivityData.find(
                      (d) => d.wacc === wacc && d.growth === growth
                    )
                    const value = data?.enterpriseValue || 0
                    const isCenter = isCenterCell(wacc, growth)

                    return (
                      <td
                        key={`${wacc}-${growth}`}
                        className={`p-2 text-center text-xs font-medium ${getCellColor(value)} ${
                          isCenter ? 'ring-2 ring-primary ring-inset' : ''
                        }`}
                      >
                        {value > 0 ? formatCurrency(value) : '-'}
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-light rounded"></div>
              <span>Higher Value</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-light/50 rounded"></div>
              <span>Mid Range</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-light rounded"></div>
              <span>Lower Value</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-primary rounded"></div>
            <span>Current</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Low Case</p>
            <p className="text-sm font-semibold text-red-dark">{formatCurrency(minValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Base Case</p>
            <p className="text-sm font-semibold text-primary">{formatCurrency(centerValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">High Case</p>
            <p className="text-sm font-semibold text-green-dark">{formatCurrency(maxValue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
