'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MARKET_BENCHMARKS, formatPercent } from '@/lib/retirement/retirement-calculator'

export function MarketDataPanel() {
  return (
    <div className="space-y-4">
      {/* Market Benchmarks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
            <span>Market Benchmarks</span>
            <span className="text-xs font-normal text-gray-500">Historical Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Historical Returns */}
            <div className="py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600 block mb-2">Historical Returns (Annualized)</span>
              <div className="space-y-1 pl-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">S&P 500 (1926-2024)</span>
                  <span className="font-medium text-gray-700">~10.0%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Bonds (1926-2024)</span>
                  <span className="font-medium text-gray-700">~5.0%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">60/40 Portfolio</span>
                  <span className="font-medium text-gray-700">~8.0%</span>
                </div>
              </div>
            </div>

            {/* Inflation */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Current Inflation (CPI)</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_BENCHMARKS.inflationRate.current)}
              </span>
            </div>

            {/* Historical Inflation */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Historical Inflation Avg</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_BENCHMARKS.inflationRate.historical)}
              </span>
            </div>

            {/* Safe Withdrawal Rate */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">Safe Withdrawal Rate (4% Rule)</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_BENCHMARKS.safeWithdrawalRate)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Last updated: {MARKET_BENCHMARKS.lastUpdated}</span>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Rules of Thumb */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900">Rules of Thumb</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 text-xs">
            <div className="p-2 bg-blue-50 rounded">
              <span className="font-medium text-blue-900">4% Rule:</span>
              <span className="text-blue-700 ml-1">
                Withdraw 4% of portfolio in year 1, then adjust for inflation
              </span>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <span className="font-medium text-green-900">25x Rule:</span>
              <span className="text-green-700 ml-1">
                Save 25x your annual spending for retirement
              </span>
            </div>
            <div className="p-2 bg-amber-50 rounded">
              <span className="font-medium text-amber-900">80% Rule:</span>
              <span className="text-amber-700 ml-1">
                Plan to need 70-80% of pre-retirement income
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Security Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900">Social Security</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Full Retirement Age</span>
              <span className="font-medium text-gray-900">67</span>
            </div>
            <div className="flex justify-between">
              <span>Early at 62 (reduction)</span>
              <span className="font-medium text-gray-900">-30%</span>
            </div>
            <div className="flex justify-between">
              <span>Delay to 70 (increase)</span>
              <span className="font-medium text-gray-900">+24%</span>
            </div>
            <div className="flex justify-between">
              <span>2024 Max Benefit (age 70)</span>
              <span className="font-medium text-gray-900">$4,873/mo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
