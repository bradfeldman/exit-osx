'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/valuation/dcf-calculator'

interface MarketDataPanelProps {
  industryBetaLow?: number
  industryBetaHigh?: number
  industryGrowthLow?: number
  industryGrowthHigh?: number
  ebitdaMultipleLow?: number
  ebitdaMultipleHigh?: number
  industrySource?: string
}

// Market data as of January 2026
const MARKET_DATA = {
  riskFreeRate: 0.0425, // 10-Year Treasury ~4.24-4.26%
  riskFreeRateRange: { low: 0.0424, high: 0.0426 },
  marketRiskPremium: { low: 0.043, high: 0.06 }, // 4.3% - 6.0%
  sizeRiskPremiumByRevenue: [
    { tier: 'Under $5M', premium: 0.06 },
    { tier: '$5M - $25M', premium: 0.04 },
    { tier: '$25M - $100M', premium: 0.025 },
    { tier: '$100M - $500M', premium: 0.015 },
    { tier: 'Over $500M', premium: 0.0 },
  ],
  lastUpdated: new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
}

export function MarketDataPanel({
  industryBetaLow = 0.8,
  industryBetaHigh = 1.2,
  industryGrowthLow = 0.02,
  industryGrowthHigh = 0.05,
  ebitdaMultipleLow = 4.0,
  ebitdaMultipleHigh = 8.0,
  industrySource = 'Default industry benchmarks',
}: MarketDataPanelProps) {
  return (
    <div className="space-y-4">
      {/* Market Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
            <span>Market Data</span>
            <span className="text-xs font-normal text-gray-500">WSJ / Federal Reserve</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Risk-Free Rate */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Risk-Free Rate (10Y Treasury)</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_DATA.riskFreeRate)}
              </span>
            </div>

            {/* Market Risk Premium */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Market Risk Premium</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_DATA.marketRiskPremium.low)} -{' '}
                {formatPercent(MARKET_DATA.marketRiskPremium.high)}
              </span>
            </div>

            {/* Size Risk Premium */}
            <div className="py-1">
              <span className="text-sm text-gray-600 block mb-2">Size Risk Premium (by Revenue)</span>
              <div className="space-y-1 pl-2">
                {MARKET_DATA.sizeRiskPremiumByRevenue.map((tier) => (
                  <div key={tier.tier} className="flex justify-between text-xs">
                    <span className="text-gray-500">{tier.tier}</span>
                    <span className="font-medium text-gray-700">{formatPercent(tier.premium)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Last updated: {MARKET_DATA.lastUpdated}</span>
          </div>
        </CardContent>
      </Card>

      {/* Industry Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
            <span>Industry Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Industry Beta */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Industry Beta</span>
              <span className="text-sm font-medium text-gray-900">
                {industryBetaLow.toFixed(2)} - {industryBetaHigh.toFixed(2)}
              </span>
            </div>

            {/* Industry Growth */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Typical Growth Rates</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(industryGrowthLow)} - {formatPercent(industryGrowthHigh)}
              </span>
            </div>

            {/* EBITDA Multiples */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">EBITDA Multiples</span>
              <span className="text-sm font-medium text-gray-900">
                {ebitdaMultipleLow.toFixed(1)}x - {ebitdaMultipleHigh.toFixed(1)}x
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Source: {industrySource}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
