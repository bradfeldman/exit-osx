'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { TextNumericInput } from '@/components/ui/text-numeric-input'
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
  riskFreeRate: { min: 0, max: 0.999, step: 0.001, default: 0.041 },
  marketRiskPremium: { min: 0, max: 0.999, step: 0.001, default: 0.050 },
  beta: { min: 0, max: 99.9, step: 0.01, default: 1.0 },
  sizeRiskPremium: { min: 0, max: 0.999, step: 0.001, default: 0.04 },
  companySpecificRisk: { min: 0, max: 0.999, step: 0.001, default: 0.05 },
  costOfDebt: { min: 0, max: 0.999, step: 0.001, default: 0.10 },
  taxRate: { min: 0, max: 0.999, step: 0.01, default: 0.25 },
}

export function WACCCalculator({ inputs, onInputChange, calculatedWACC, ebitdaTier }: WACCCalculatorProps) {
  const costOfEquity = calculateCostOfEquity(
    inputs.riskFreeRate,
    inputs.marketRiskPremium,
    inputs.beta,
    inputs.sizeRiskPremium,
    inputs.companySpecificRisk
  )

  const renderInput = (
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
          <Label htmlFor={key} className="text-sm text-foreground">
            {label}
          </Label>
          <div className="flex items-center gap-2">
            <TextNumericInput
              id={key}
              value={value as number}
              onCommit={(v) => {
                if (v !== null) onInputChange(key, v as WACCInputs[typeof key])
              }}
              multiplier={isBeta ? 1 : 100}
              decimals={isBeta ? 2 : 1}
              className="w-20 h-7 text-sm text-right"
            />
            {isPercent && !isBeta && <span className="text-xs text-muted-foreground">%</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">WACC Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Cost of Equity Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-foreground">Cost of Equity (CAPM + Build-Up)</h4>
            {ebitdaTier && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-light text-primary font-medium">
                {ebitdaTier} tier
              </span>
            )}
          </div>
          <div className="space-y-4">
            {renderInput('riskFreeRate', 'Risk-Free Rate')}
            {renderInput('marketRiskPremium', 'Equity Risk Premium')}
            {renderInput('beta', 'Beta', true, true)}
            {renderInput('sizeRiskPremium', 'Size Risk Premium')}
            {renderInput('companySpecificRisk', 'Company-Specific Risk')}
          </div>

          {/* Cost of Equity Formula Display */}
          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Cost of Equity Formula</div>
            <div className="text-sm font-mono text-foreground">
              Re = Rf + &beta;(ERP) + Size + CSR
            </div>
            <div className="text-sm font-mono text-foreground mt-1">
              Re = {formatPercent(inputs.riskFreeRate)} + {inputs.beta.toFixed(2)} &times;{' '}
              {formatPercent(inputs.marketRiskPremium)} + {formatPercent(inputs.sizeRiskPremium)} + {formatPercent(inputs.companySpecificRisk)}
            </div>
            <div className="text-sm font-semibold text-primary mt-2">
              Cost of Equity = {formatPercent(costOfEquity)}
            </div>
            {inputs.companySpecificRisk > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                CSR is driven by your Business Readiness Index score
              </div>
            )}
          </div>
        </div>

        {/* Cost of Debt Section */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-4">Cost of Debt</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="costOfDebt" className="text-sm text-foreground">
                  Cost of Debt (Override)
                </Label>
                <div className="flex items-center gap-2">
                  <TextNumericInput
                    id="costOfDebt"
                    value={inputs.costOfDebt}
                    onCommit={(v) => onInputChange('costOfDebt', v)}
                    multiplier={100}
                    decimals={1}
                    placeholder="Auto"
                    className="w-20 h-7 text-sm text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="taxRate" className="text-sm text-foreground">
                  Tax Rate (Override)
                </Label>
                <div className="flex items-center gap-2">
                  <TextNumericInput
                    id="taxRate"
                    value={inputs.taxRate}
                    onCommit={(v) => onInputChange('taxRate', v)}
                    multiplier={100}
                    decimals={0}
                    placeholder="25%"
                    className="w-20 h-7 text-sm text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WACC Result */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
            <span className="text-sm font-medium text-foreground">Calculated WACC</span>
            <span className="text-lg font-bold text-primary">{formatPercent(calculatedWACC)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
