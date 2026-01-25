'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateSensitivityTable, formatCurrency, formatPercent, type DCFInputs } from '@/lib/valuation/dcf-calculator'

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
  const minValue = Math.min(...validValues)
  const maxValue = Math.max(...validValues)
  const centerValue = sensitivityData.find(
    (d) => d.wacc === centerWACC && d.growth === centerTerminalGrowth
  )?.enterpriseValue || 0

  // Calculate color for cell based on value relative to center
  const getCellColor = (value: number) => {
    if (value === 0) return 'bg-gray-100 text-gray-400'

    const range = maxValue - minValue
    if (range === 0) return 'bg-gray-50'

    const normalized = (value - minValue) / range

    // Use a gradient from red (low) to green (high)
    if (normalized >= 0.7) {
      return 'bg-green-100 text-green-900'
    } else if (normalized >= 0.5) {
      return 'bg-green-50 text-green-800'
    } else if (normalized >= 0.3) {
      return 'bg-yellow-50 text-yellow-800'
    } else if (normalized >= 0.15) {
      return 'bg-orange-50 text-orange-800'
    } else {
      return 'bg-red-50 text-red-800'
    }
  }

  // Check if this is the center cell
  const isCenterCell = (wacc: number, growth: number) => {
    return wacc === centerWACC && growth === centerTerminalGrowth
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-gray-900">
          Sensitivity Analysis
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          Enterprise Value by WACC vs Terminal Growth Rate
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs text-gray-500 font-medium">
                  WACC \ Terminal Growth
                </th>
                {terminalGrowthValues.map((growth) => (
                  <th
                    key={growth}
                    className={`p-2 text-center text-xs font-medium ${
                      growth === centerTerminalGrowth
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-500'
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
                      wacc === centerWACC ? 'bg-primary/10 text-primary' : 'text-gray-500'
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
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              <span>Higher Value</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-50 rounded"></div>
              <span>Mid Range</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-50 rounded"></div>
              <span>Lower Value</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-primary rounded"></div>
            <span>Current</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Low Case</p>
            <p className="text-sm font-semibold text-red-700">{formatCurrency(minValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Base Case</p>
            <p className="text-sm font-semibold text-primary">{formatCurrency(centerValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">High Case</p>
            <p className="text-sm font-semibold text-green-700">{formatCurrency(maxValue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
