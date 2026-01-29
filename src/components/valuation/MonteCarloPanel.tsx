'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { formatCurrency, type DCFInputs } from '@/lib/valuation/dcf-calculator'
import { runMonteCarloSimulation, type MonteCarloResults } from '@/lib/valuation/monte-carlo'
import { analytics } from '@/lib/analytics'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

interface MonteCarloPanelProps {
  baseInputs: DCFInputs
  finalEBITDA?: number
}

export function MonteCarloPanel({ baseInputs, finalEBITDA }: MonteCarloPanelProps) {
  const [waccStdDev, setWaccStdDev] = useState(0.01) // 1% standard deviation
  const [growthStdDev, setGrowthStdDev] = useState(0.02) // 2% standard deviation
  const [terminalGrowthStdDev, setTerminalGrowthStdDev] = useState(0.005) // 0.5% standard deviation
  const [iterations, setIterations] = useState(10000)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<MonteCarloResults | null>(null)

  const runSimulation = useCallback(async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)

    try {
      const simulationResults = await runMonteCarloSimulation(
        {
          baseInputs,
          waccStdDev,
          growthStdDev,
          terminalGrowthStdDev,
          iterations,
          finalEBITDA,
        },
        (p) => setProgress(p)
      )
      setResults(simulationResults)

      // Track Monte Carlo simulation run
      analytics.track('monte_carlo_run', {
        iterations,
        resultMedian: simulationResults.median,
        resultP10: simulationResults.p10,
        resultP90: simulationResults.p90,
      })
    } catch (error) {
      console.error('Monte Carlo simulation failed:', error)
    } finally {
      setIsRunning(false)
    }
  }, [baseInputs, waccStdDev, growthStdDev, terminalGrowthStdDev, iterations, finalEBITDA])

  // Custom tooltip for histogram
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { min: number; max: number; count: number; percentage: number } }> }) => {
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
        {/* Input Uncertainty Ranges */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">WACC Uncertainty</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">+/-</span>
              <Input
                type="number"
                step={0.1}
                value={(waccStdDev * 100).toFixed(1)}
                onChange={(e) => setWaccStdDev(parseFloat(e.target.value) / 100 || 0)}
                className="h-7 text-sm"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <Slider
              value={waccStdDev}
              onValueChange={setWaccStdDev}
              min={0.005}
              max={0.03}
              step={0.001}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Growth Uncertainty</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">+/-</span>
              <Input
                type="number"
                step={0.1}
                value={(growthStdDev * 100).toFixed(1)}
                onChange={(e) => setGrowthStdDev(parseFloat(e.target.value) / 100 || 0)}
                className="h-7 text-sm"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <Slider
              value={growthStdDev}
              onValueChange={setGrowthStdDev}
              min={0.01}
              max={0.05}
              step={0.001}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Terminal Growth Uncertainty</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">+/-</span>
              <Input
                type="number"
                step={0.1}
                value={(terminalGrowthStdDev * 100).toFixed(1)}
                onChange={(e) => setTerminalGrowthStdDev(parseFloat(e.target.value) / 100 || 0)}
                className="h-7 text-sm"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <Slider
              value={terminalGrowthStdDev}
              onValueChange={setTerminalGrowthStdDev}
              min={0.002}
              max={0.015}
              step={0.001}
            />
          </div>
        </div>

        {/* Iterations Selector */}
        <div className="flex items-center gap-4 pt-2">
          <Label className="text-sm text-gray-600">Iterations:</Label>
          <div className="flex gap-2">
            {[1000, 5000, 10000, 25000].map((count) => (
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
            {/* Histogram */}
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-3">Value Distribution</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={results.histogram}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="min"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(value) => formatCurrency(value)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      x={results.median}
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      label={{ value: 'Median', position: 'top', fontSize: 10 }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {results.histogram.map((entry, index) => {
                        // Color based on percentile
                        const isInConfidenceInterval =
                          entry.min >= results.percentile5 && entry.max <= results.percentile95
                        const isInIQR =
                          entry.min >= results.percentile25 && entry.max <= results.percentile75
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              isInIQR
                                ? 'hsl(var(--primary))'
                                : isInConfidenceInterval
                                ? 'hsl(var(--primary) / 0.6)'
                                : 'hsl(var(--primary) / 0.3)'
                            }
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">25th Percentile</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(results.percentile25)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-gray-500">Median (50th)</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(results.median)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">75th Percentile</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(results.percentile75)}
                </p>
              </div>
            </div>

            {/* Confidence Interval */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">90% Confidence Interval</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-blue-600">5th Percentile</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(results.percentile5)}
                  </p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-blue-200 rounded-full relative">
                  <div
                    className="absolute h-2 bg-blue-500 rounded-full"
                    style={{
                      left: '5%',
                      right: '5%',
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-600">95th Percentile</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(results.percentile95)}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500">Mean</p>
                <p className="text-sm font-medium">{formatCurrency(results.mean)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Std Dev</p>
                <p className="text-sm font-medium">{formatCurrency(results.standardDeviation)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Min</p>
                <p className="text-sm font-medium">{formatCurrency(results.min)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Max</p>
                <p className="text-sm font-medium">{formatCurrency(results.max)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
