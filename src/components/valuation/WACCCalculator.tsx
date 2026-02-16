'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { calculateCostOfEquity, formatPercent } from '@/lib/valuation/dcf-calculator'

export interface WACCInputs {
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk: number
  costOfDebt: number | null
  taxRate: number | null
}

interface WACCCalculatorProps {
  inputs: WACCInputs
  onInputChange: <K extends keyof WACCInputs>(key: K, value: WACCInputs[K]) => void
  calculatedWACC: number
  ebitdaTier?: string | null
}

const INPUT_RANGES = {
  riskFreeRate: { min: 0.030, max: 0.060, step: 0.001, default: 0.041 },
  marketRiskPremium: { min: 0.04, max: 0.07, step: 0.001, default: 0.050 },
  beta: { min: 0.5, max: 2.0, step: 0.01, default: 1.0 },
  sizeRiskPremium: { min: 0.010, max: 0.080, step: 0.001, default: 0.04 },
  companySpecificRisk: { min: 0, max: 0.120, step: 0.001, default: 0.05 },
  costOfDebt: { min: 0.05, max: 0.15, step: 0.001, default: 0.10 },
  taxRate: { min: 0.15, max: 0.40, step: 0.01, default: 0.25 },
}

export function WACCCalculator({ inputs, onInputChange, calculatedWACC, ebitdaTier }: WACCCalculatorProps) {
  const costOfEquity = calculateCostOfEquity(
    inputs.riskFreeRate,
    inputs.marketRiskPremium,
    inputs.beta,
    inputs.sizeRiskPremium,
    inputs.companySpecificRisk
  )

  const handleSliderChange = (key: keyof WACCInputs, value: number) => {
    if (key === 'costOfDebt' || key === 'taxRate') {
      onInputChange(key, value)
    } else {
      onInputChange(key, value)
    }
  }

  const handleInputChange = (key: keyof WACCInputs, value: string) => {
    const numValue = parseFloat(value) / 100
    if (!isNaN(numValue)) {
      if (key === 'beta') {
        onInputChange(key, parseFloat(value))
      } else {
        onInputChange(key, numValue)
      }
    }
  }

  const renderSliderInput = (
    key: keyof WACCInputs,
    label: string,
    isPercent: boolean = true,
    isBeta: boolean = false
  ) => {
    const range = INPUT_RANGES[key]
    const value = inputs[key] ?? range.default

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor={key} className="text-sm text-gray-700">
            {label}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={key}
              type="number"
              step={isBeta ? 0.01 : 0.1}
              value={isBeta ? (value as number).toFixed(2) : ((value as number) * 100).toFixed(1)}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className="w-20 h-7 text-sm text-right"
            />
            {isPercent && !isBeta && <span className="text-xs text-gray-500">%</span>}
          </div>
        </div>
        <Slider
          value={value as number}
          onValueChange={(v) => handleSliderChange(key, v)}
          min={range.min}
          max={range.max}
          step={range.step}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{isBeta ? range.min.toFixed(1) : formatPercent(range.min, 1)}</span>
          <span>{isBeta ? range.max.toFixed(1) : formatPercent(range.max, 1)}</span>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-gray-900">WACC Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Cost of Equity Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-gray-800">Cost of Equity (CAPM + Build-Up)</h4>
            {ebitdaTier && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {ebitdaTier} tier
              </span>
            )}
          </div>
          <div className="space-y-4">
            {renderSliderInput('riskFreeRate', 'Risk-Free Rate')}
            {renderSliderInput('marketRiskPremium', 'Equity Risk Premium')}
            {renderSliderInput('beta', 'Beta', true, true)}
            {renderSliderInput('sizeRiskPremium', 'Size Risk Premium')}
            {renderSliderInput('companySpecificRisk', 'Company-Specific Risk')}
          </div>

          {/* Cost of Equity Formula Display */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Cost of Equity Formula</div>
            <div className="text-sm font-mono text-gray-700">
              Re = Rf + &beta;(ERP) + Size + CSR
            </div>
            <div className="text-sm font-mono text-gray-700 mt-1">
              Re = {formatPercent(inputs.riskFreeRate)} + {inputs.beta.toFixed(2)} &times;{' '}
              {formatPercent(inputs.marketRiskPremium)} + {formatPercent(inputs.sizeRiskPremium)} + {formatPercent(inputs.companySpecificRisk)}
            </div>
            <div className="text-sm font-semibold text-primary mt-2">
              Cost of Equity = {formatPercent(costOfEquity)}
            </div>
            {inputs.companySpecificRisk > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                CSR is driven by your Business Readiness Index score
              </div>
            )}
          </div>
        </div>

        {/* Cost of Debt Section */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-800 mb-4">Cost of Debt</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="costOfDebt" className="text-sm text-gray-700">
                  Cost of Debt (Override)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="costOfDebt"
                    type="number"
                    step={0.1}
                    placeholder="Auto"
                    value={
                      inputs.costOfDebt !== null ? (inputs.costOfDebt * 100).toFixed(1) : ''
                    }
                    onChange={(e) =>
                      onInputChange(
                        'costOfDebt',
                        e.target.value ? parseFloat(e.target.value) / 100 : null
                      )
                    }
                    className="w-20 h-7 text-sm text-right"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
              {inputs.costOfDebt !== null && (
                <Slider
                  value={inputs.costOfDebt}
                  onValueChange={(v) => onInputChange('costOfDebt', v)}
                  min={INPUT_RANGES.costOfDebt.min}
                  max={INPUT_RANGES.costOfDebt.max}
                  step={INPUT_RANGES.costOfDebt.step}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="taxRate" className="text-sm text-gray-700">
                  Tax Rate (Override)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="taxRate"
                    type="number"
                    step={1}
                    placeholder="25%"
                    value={inputs.taxRate !== null ? (inputs.taxRate * 100).toFixed(0) : ''}
                    onChange={(e) =>
                      onInputChange(
                        'taxRate',
                        e.target.value ? parseFloat(e.target.value) / 100 : null
                      )
                    }
                    className="w-20 h-7 text-sm text-right"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
              {inputs.taxRate !== null && (
                <Slider
                  value={inputs.taxRate}
                  onValueChange={(v) => onInputChange('taxRate', v)}
                  min={INPUT_RANGES.taxRate.min}
                  max={INPUT_RANGES.taxRate.max}
                  step={INPUT_RANGES.taxRate.step}
                />
              )}
            </div>
          </div>
        </div>

        {/* WACC Result */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
            <span className="text-sm font-medium text-gray-800">Calculated WACC</span>
            <span className="text-lg font-bold text-primary">{formatPercent(calculatedWACC)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
