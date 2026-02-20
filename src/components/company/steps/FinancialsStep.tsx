'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { CompanyFormData } from '../CompanySetupWizard'

interface FinancialsStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

function formatCurrency(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function FinancialsStep({ formData, updateFormData }: FinancialsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Financial Information</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your company&apos;s annual financial data. These figures form the foundation of your valuation calculation.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="annualRevenue">Annual Revenue</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="annualRevenue"
              type="text"
              inputMode="numeric"
              value={formData.annualRevenue > 0 ? formData.annualRevenue.toLocaleString() : ''}
              onChange={(e) => updateFormData({ annualRevenue: parseCurrency(e.target.value) })}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Your total revenue for the most recent fiscal year
          </p>
        </div>

        <div>
          <Label htmlFor="annualEbitda">Annual EBITDA</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="annualEbitda"
              type="text"
              inputMode="numeric"
              value={formData.annualEbitda > 0 ? formData.annualEbitda.toLocaleString() : ''}
              onChange={(e) => updateFormData({ annualEbitda: parseCurrency(e.target.value) })}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Earnings Before Interest, Taxes, Depreciation, and Amortization
          </p>
        </div>

        <div>
          <Label htmlFor="ownerCompensation">Owner&apos;s Total Compensation</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="ownerCompensation"
              type="text"
              inputMode="numeric"
              value={formData.ownerCompensation > 0 ? formData.ownerCompensation.toLocaleString() : ''}
              onChange={(e) => updateFormData({ ownerCompensation: parseCurrency(e.target.value) })}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Include salary, bonuses, distributions, and any personal expenses run through the business
          </p>
        </div>

        {/* Calculated preview */}
        {formData.annualRevenue > 0 && (
          <div className="mt-6 p-4 bg-secondary rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-medium">{formatCurrency(formData.annualRevenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">EBITDA</p>
                <p className="font-medium">{formatCurrency(formData.annualEbitda)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">EBITDA Margin</p>
                <p className="font-medium">
                  {formData.annualRevenue > 0
                    ? `${((formData.annualEbitda / formData.annualRevenue) * 100).toFixed(1)}%`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Owner Compensation</p>
                <p className="font-medium">{formatCurrency(formData.ownerCompensation)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
