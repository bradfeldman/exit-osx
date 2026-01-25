'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { formatCurrency } from '@/lib/retirement/retirement-calculator'
import type { RetirementAsset, RetirementAssumptions } from '@/lib/retirement/retirement-calculator'
import {
  runRetirementMonteCarloSimulation,
  type RetirementMonteCarloResults,
} from '@/lib/retirement/monte-carlo'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'

interface MonteCarloPanelProps {
  assets: RetirementAsset[]
  assumptions: RetirementAssumptions
}

// Custom tooltip defined outside component
function HistogramTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { min: number; max: number; count: number; percentage: number } }>
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
        <p className="text-sm text-gray-600">
          {formatCurrency(data.min)} - {formatCurrency(data.max)}
        </p>
        <p className="text-sm font-medium">{data.count} simulations</p>
        <p className="text-xs text-gray-500">{data.percentage.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export function MonteCarloPanel({ assets, assumptions }: MonteCarloPanelProps) {
  const [returnStdDev, setReturnStdDev] = useState(0.15) // 15% standard deviation
  const [inflationStdDev, setInflationStdDev] = useState(0.01) // 1% standard deviation
  const [iterations, setIterations] = useState(5000)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<RetirementMonteCarloResults | null>(null)

  const runSimulation = useCallback(async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)

    try {
      const simulationResults = await runRetirementMonteCarloSimulation(
        {
          assets,
          assumptions,
          returnStdDev,
          inflationStdDev,
          iterations,
        },
        (p) => setProgress(p)
      )
      setResults(simulationResults)
    } catch (error) {
      console.error('Monte Carlo simulation failed:', error)
    } finally {
      setIsRunning(false)
    }
  }, [assets, assumptions, returnStdDev, inflationStdDev, iterations])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium text-gray-900">
            Monte Carlo Simulation
          </CardTitle>
          <Button onClick={runSimulation} disabled={isRunning} size="sm">
            {isRunning ? `Running... ${Math.round(progress * 100)}%` : 'Run Simulation'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Input Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Return Volatility (Std Dev)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={1}
                value={(returnStdDev * 100).toFixed(0)}
                onChange={(e) => setReturnStdDev(parseFloat(e.target.value) / 100 || 0)}
                className="h-7 text-sm w-16"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <Slider
              value={returnStdDev}
              onValueChange={setReturnStdDev}
              min={0.05}
              max={0.25}
              step={0.01}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Inflation Volatility (Std Dev)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={0.1}
                value={(inflationStdDev * 100).toFixed(1)}
                onChange={(e) => setInflationStdDev(parseFloat(e.target.value) / 100 || 0)}
                className="h-7 text-sm w-16"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <Slider
              value={inflationStdDev}
              onValueChange={setInflationStdDev}
              min={0.005}
              max={0.03}
              step={0.001}
            />
          </div>
        </div>

        {/* Iterations Selector */}
        <div className="flex items-center gap-4">
          <Label className="text-sm text-gray-600">Iterations:</Label>
          <div className="flex gap-2">
            {[1000, 5000, 10000].map((count) => (
              <button
                key={count}
                onClick={() => setIterations(count)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  iterations === count
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {count.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-5 pt-4 border-t border-gray-200">
            {/* Success Rate - Big Number */}
            <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Retirement Success Probability</p>
              <p
                className={`text-4xl font-bold ${
                  results.successRate >= 90
                    ? 'text-green-600'
                    : results.successRate >= 70
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {results.successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                of {iterations.toLocaleString()} simulations lasted through retirement
              </p>
            </div>

            {/* Success Rate by Year Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-3">
                Success Rate Over Retirement
              </h4>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={results.yearlySuccessRates.filter((_, i) => i % 5 === 0 || i === results.yearlySuccessRates.length - 1)}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `Y${v}`}
                    />
                    <YAxis
                      tick={{ fontSize: 9 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ending Balance Histogram */}
            {results.histogram.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-3">
                  Ending Balance Distribution
                </h4>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={results.histogram}
                      margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="min" tick={false} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip content={<HistogramTooltip />} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {results.histogram.map((_, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--primary) / 0.7)" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-500">10th Percentile</p>
                <p className="text-sm font-medium">
                  {formatCurrency(results.percentile10EndingBalance)}
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded text-center">
                <p className="text-xs text-gray-500">Median</p>
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(results.medianEndingBalance)}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-500">90th Percentile</p>
                <p className="text-sm font-medium">
                  {formatCurrency(results.percentile90EndingBalance)}
                </p>
              </div>
            </div>

            {/* Interpretation */}
            <div
              className={`p-3 rounded-lg ${
                results.successRate >= 90
                  ? 'bg-green-50'
                  : results.successRate >= 70
                  ? 'bg-amber-50'
                  : 'bg-red-50'
              }`}
            >
              <p
                className={`text-xs ${
                  results.successRate >= 90
                    ? 'text-green-700'
                    : results.successRate >= 70
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {results.successRate >= 90 ? (
                  <>
                    <span className="font-medium">Excellent:</span> Your plan has a very high
                    probability of success.
                  </>
                ) : results.successRate >= 70 ? (
                  <>
                    <span className="font-medium">Moderate:</span> Consider reducing spending or
                    increasing savings for more security.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Needs Attention:</span> Significant changes
                    recommended to improve retirement security.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
