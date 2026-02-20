'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MARKET_BENCHMARKS, formatPercent } from '@/lib/retirement/retirement-calculator'

export function MarketDataPanel() {
  return (
    <div className="space-y-4">
      {/* Market Benchmarks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground flex items-center justify-between">
            <span>Market Benchmarks</span>
            <span className="text-xs font-normal text-muted-foreground">Historical Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Historical Returns */}
            <div className="py-1 border-b border-border">
              <span className="text-sm text-muted-foreground block mb-2">Historical Returns (Annualized)</span>
              <div className="space-y-1 pl-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">S&P 500 (1926-2024)</span>
                  <span className="font-medium text-foreground">~10.0%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Bonds (1926-2024)</span>
                  <span className="font-medium text-foreground">~5.0%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">60/40 Portfolio</span>
                  <span className="font-medium text-foreground">~8.0%</span>
                </div>
              </div>
            </div>

            {/* Inflation */}
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Current Inflation (CPI)</span>
              <span className="text-sm font-medium text-foreground">
                {formatPercent(MARKET_BENCHMARKS.inflationRate.current)}
              </span>
            </div>

            {/* Historical Inflation */}
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Historical Inflation Avg</span>
              <span className="text-sm font-medium text-foreground">
                {formatPercent(MARKET_BENCHMARKS.inflationRate.historical)}
              </span>
            </div>

            {/* Safe Withdrawal Rate */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Safe Withdrawal Rate (4% Rule)</span>
              <span className="text-sm font-medium text-foreground">
                {formatPercent(MARKET_BENCHMARKS.safeWithdrawalRate)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Last updated: {MARKET_BENCHMARKS.lastUpdated}</span>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Rules of Thumb */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Rules of Thumb</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 text-xs">
            <div className="p-2 bg-accent-light rounded">
              <span className="font-medium text-primary">4% Rule:</span>
              <span className="text-primary ml-1">
                Withdraw 4% of portfolio in year 1, then adjust for inflation
              </span>
            </div>
            <div className="p-2 bg-green-light rounded">
              <span className="font-medium text-green-dark">25x Rule:</span>
              <span className="text-green-dark ml-1">
                Save 25x your annual spending for retirement
              </span>
            </div>
            <div className="p-2 bg-orange-light rounded">
              <span className="font-medium text-orange-dark">80% Rule:</span>
              <span className="text-orange-dark ml-1">
                Plan to need 70-80% of pre-retirement income
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Security Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Social Security</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Full Retirement Age</span>
              <span className="font-medium text-foreground">67</span>
            </div>
            <div className="flex justify-between">
              <span>Early at 62 (reduction)</span>
              <span className="font-medium text-foreground">-30%</span>
            </div>
            <div className="flex justify-between">
              <span>Delay to 70 (increase)</span>
              <span className="font-medium text-foreground">+24%</span>
            </div>
            <div className="flex justify-between">
              <span>2024 Max Benefit (age 70)</span>
              <span className="font-medium text-foreground">$4,873/mo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
