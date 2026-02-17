'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface WACCAssumptions {
  baseFCF: number | null
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  costOfDebtOverride: number | null
  taxRateOverride: number | null
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number
  exitMultiple: number | null
  growthAssumptions: Record<string, number>
}

interface WACCModalProps {
  open: boolean
  onClose: () => void
  companyId: string
  onSaved?: () => void
}

const DEFAULT_ASSUMPTIONS: WACCAssumptions = {
  baseFCF: null,
  riskFreeRate: 0.04, // 4%
  marketRiskPremium: 0.055, // 5.5%
  beta: 1.0,
  sizeRiskPremium: 0.02, // 2%
  costOfDebtOverride: null,
  taxRateOverride: null,
  terminalMethod: 'gordon',
  perpetualGrowthRate: 0.025, // 2.5%
  exitMultiple: null,
  growthAssumptions: {
    year1: 0.05,
    year2: 0.04,
    year3: 0.03,
    year4: 0.025,
    year5: 0.02,
  },
}

// Format number with commas for display
function formatNumberWithCommas(value: number | null): string {
  if (value === null) return ''
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

// Parse number from formatted string (removes commas)
function parseFormattedNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, '')
  if (!cleaned || isNaN(Number(cleaned))) return null
  return Number(cleaned)
}

export function WACCModal({ open, onClose, companyId, onSaved }: WACCModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assumptions, setAssumptions] = useState<WACCAssumptions>(DEFAULT_ASSUMPTIONS)
  const [baseFCFDisplay, setBaseFCFDisplay] = useState('')

  // Fetch latest FCF from financials for default
  const fetchLatestFCF = useCallback(async (): Promise<number | null> => {
    try {
      // Fetch financial periods to find the most recent one with cash flow data
      const periodsResponse = await fetch(`/api/companies/${companyId}/financial-periods`)
      if (!periodsResponse.ok) return null

      const periodsData = await periodsResponse.json()
      const periods = periodsData.periods || []

      // Sort by fiscal year descending to get the most recent
      const sortedPeriods = periods.sort((a: { fiscalYear: number }, b: { fiscalYear: number }) => b.fiscalYear - a.fiscalYear)

      for (const period of sortedPeriods) {
        // Try to get cash flow for this period
        const cfResponse = await fetch(`/api/companies/${companyId}/financial-periods/${period.id}/cash-flow`)
        if (cfResponse.ok) {
          const cfData = await cfResponse.json()
          if (cfData.cashFlowStatement?.freeCashFlow) {
            return cfData.cashFlowStatement.freeCashFlow
          }
        }
      }
      return null
    } catch (error) {
      console.error('Failed to fetch latest FCF:', error)
      return null
    }
  }, [companyId])

  // Fetch existing assumptions
  const fetchAssumptions = useCallback(async () => {
    if (!companyId || !open) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/dcf`)
      if (response.ok) {
        const data = await response.json()
        if (data.assumptions) {
          const savedBaseFCF = data.assumptions.baseFCF ? Number(data.assumptions.baseFCF) : null
          setAssumptions({
            baseFCF: savedBaseFCF,
            riskFreeRate: Number(data.assumptions.riskFreeRate) || DEFAULT_ASSUMPTIONS.riskFreeRate,
            marketRiskPremium: Number(data.assumptions.marketRiskPremium) || DEFAULT_ASSUMPTIONS.marketRiskPremium,
            beta: Number(data.assumptions.beta) || DEFAULT_ASSUMPTIONS.beta,
            sizeRiskPremium: Number(data.assumptions.sizeRiskPremium) || DEFAULT_ASSUMPTIONS.sizeRiskPremium,
            costOfDebtOverride: data.assumptions.costOfDebtOverride ? Number(data.assumptions.costOfDebtOverride) : null,
            taxRateOverride: data.assumptions.taxRateOverride ? Number(data.assumptions.taxRateOverride) : null,
            terminalMethod: data.assumptions.terminalMethod || 'gordon',
            perpetualGrowthRate: Number(data.assumptions.perpetualGrowthRate) || DEFAULT_ASSUMPTIONS.perpetualGrowthRate,
            exitMultiple: data.assumptions.exitMultiple ? Number(data.assumptions.exitMultiple) : null,
            growthAssumptions: data.assumptions.growthAssumptions || DEFAULT_ASSUMPTIONS.growthAssumptions,
          })
          setBaseFCFDisplay(formatNumberWithCommas(savedBaseFCF))

          // If no saved baseFCF, try to get it from financials
          if (!savedBaseFCF) {
            const latestFCF = await fetchLatestFCF()
            if (latestFCF !== null) {
              setAssumptions(prev => ({ ...prev, baseFCF: latestFCF }))
              setBaseFCFDisplay(formatNumberWithCommas(latestFCF))
            }
          }
        } else {
          // No saved assumptions, try to get baseFCF from financials
          const latestFCF = await fetchLatestFCF()
          if (latestFCF !== null) {
            setAssumptions(prev => ({ ...prev, baseFCF: latestFCF }))
            setBaseFCFDisplay(formatNumberWithCommas(latestFCF))
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch assumptions:', error)
    } finally {
      setLoading(false)
    }
  }, [companyId, open, fetchLatestFCF])

  useEffect(() => {
    if (open) {
      fetchAssumptions()
    }
  }, [fetchAssumptions, open])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/dcf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assumptions),
      })

      if (response.ok) {
        onSaved?.()
        onClose()
      } else {
        const data = await response.json()
        console.error('Failed to save:', data.error)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateAssumption = <K extends keyof WACCAssumptions>(
    key: K,
    value: WACCAssumptions[K]
  ) => {
    setAssumptions(prev => ({ ...prev, [key]: value }))
  }

  const updateGrowthRate = (year: string, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      growthAssumptions: { ...prev.growthAssumptions, [year]: value },
    }))
  }

  // Calculate WACC for display
  const costOfEquity =
    assumptions.riskFreeRate +
    assumptions.beta * assumptions.marketRiskPremium +
    assumptions.sizeRiskPremium

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WACC Configuration</DialogTitle>
          <DialogDescription>
            Configure Weighted Average Cost of Capital assumptions for DCF valuation
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Base Free Cash Flow Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Base Free Cash Flow (Year 0)</h4>
              <div>
                <Label htmlFor="baseFCF">Free Cash Flow ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="baseFCF"
                    type="text"
                    className="pl-7"
                    placeholder="Enter or pulled from Financials"
                    value={baseFCFDisplay}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,]/g, '') // Only allow digits and commas
                      setBaseFCFDisplay(value)
                      updateAssumption('baseFCF', parseFormattedNumber(value))
                    }}
                    onBlur={() => {
                      // Reformat on blur
                      if (assumptions.baseFCF !== null) {
                        setBaseFCFDisplay(formatNumberWithCommas(assumptions.baseFCF))
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Defaults to the most recent Free Cash Flow from your Financials
                </p>
              </div>
            </div>

            {/* Cost of Equity Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Cost of Equity (CAPM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="riskFreeRate">Risk-Free Rate (%)</Label>
                  <Input
                    id="riskFreeRate"
                    type="number"
                    step="0.01"
                    value={(assumptions.riskFreeRate * 100).toFixed(2)}
                    onChange={(e) => updateAssumption('riskFreeRate', Number(e.target.value) / 100)}
                  />
                </div>
                <div>
                  <Label htmlFor="marketRiskPremium">Market Risk Premium (%)</Label>
                  <Input
                    id="marketRiskPremium"
                    type="number"
                    step="0.01"
                    value={(assumptions.marketRiskPremium * 100).toFixed(2)}
                    onChange={(e) => updateAssumption('marketRiskPremium', Number(e.target.value) / 100)}
                  />
                </div>
                <div>
                  <Label htmlFor="beta">Beta</Label>
                  <Input
                    id="beta"
                    type="number"
                    step="0.01"
                    value={assumptions.beta.toFixed(2)}
                    onChange={(e) => updateAssumption('beta', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="sizeRiskPremium">Size Premium (%)</Label>
                  <Input
                    id="sizeRiskPremium"
                    type="number"
                    step="0.01"
                    value={(assumptions.sizeRiskPremium * 100).toFixed(2)}
                    onChange={(e) => updateAssumption('sizeRiskPremium', Number(e.target.value) / 100)}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Cost of Equity: <span className="font-medium">{(costOfEquity * 100).toFixed(2)}%</span>
              </p>
            </div>

            {/* Cost of Debt Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Cost of Debt</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="costOfDebtOverride">Cost of Debt Override (% or leave blank for auto)</Label>
                  <Input
                    id="costOfDebtOverride"
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={assumptions.costOfDebtOverride !== null ? (assumptions.costOfDebtOverride * 100).toFixed(2) : ''}
                    onChange={(e) => updateAssumption('costOfDebtOverride', e.target.value ? Number(e.target.value) / 100 : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="taxRateOverride">Tax Rate Override (% or leave blank for auto)</Label>
                  <Input
                    id="taxRateOverride"
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={assumptions.taxRateOverride !== null ? (assumptions.taxRateOverride * 100).toFixed(2) : ''}
                    onChange={(e) => updateAssumption('taxRateOverride', e.target.value ? Number(e.target.value) / 100 : null)}
                  />
                </div>
              </div>
            </div>

            {/* Growth Assumptions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">FCF Growth Assumptions</h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {['year1', 'year2', 'year3', 'year4', 'year5'].map((year, idx) => (
                  <div key={year}>
                    <Label htmlFor={year} className="text-xs">Year {idx + 1} (%)</Label>
                    <Input
                      id={year}
                      type="number"
                      step="0.1"
                      className="text-sm"
                      value={((assumptions.growthAssumptions[year] || 0) * 100).toFixed(1)}
                      onChange={(e) => updateGrowthRate(year, Number(e.target.value) / 100)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal Value Method */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Terminal Value</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="terminalMethod">Method</Label>
                  <Select
                    value={assumptions.terminalMethod}
                    onValueChange={(value) => updateAssumption('terminalMethod', value as 'gordon' | 'exit_multiple')}
                  >
                    <SelectTrigger id="terminalMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gordon">Gordon Growth Model</SelectItem>
                      <SelectItem value="exit_multiple">Exit Multiple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {assumptions.terminalMethod === 'gordon' ? (
                  <div>
                    <Label htmlFor="perpetualGrowthRate">Perpetual Growth Rate (%)</Label>
                    <Input
                      id="perpetualGrowthRate"
                      type="number"
                      step="0.1"
                      value={(assumptions.perpetualGrowthRate * 100).toFixed(1)}
                      onChange={(e) => updateAssumption('perpetualGrowthRate', Number(e.target.value) / 100)}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="exitMultiple">Exit EBITDA Multiple</Label>
                    <Input
                      id="exitMultiple"
                      type="number"
                      step="0.1"
                      value={assumptions.exitMultiple?.toFixed(1) || ''}
                      onChange={(e) => updateAssumption('exitMultiple', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Calculate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
