'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CompanyFormData } from '../CompanySetupWizard'

interface CoreFactorsStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

const revenueSizeOptions = [
  { value: 'UNDER_500K', label: 'Under $500K', description: 'Early stage or micro business' },
  { value: 'FROM_500K_TO_1M', label: '$500K - $1M', description: 'Small business' },
  { value: 'FROM_1M_TO_3M', label: '$1M - $3M', description: 'Established small business' },
  { value: 'FROM_3M_TO_10M', label: '$3M - $10M', description: 'Lower middle market' },
  { value: 'FROM_10M_TO_25M', label: '$10M - $25M', description: 'Middle market' },
  { value: 'OVER_25M', label: 'Over $25M', description: 'Upper middle market' },
]

const revenueModelOptions = [
  { value: 'PROJECT_BASED', label: 'Project-Based', description: 'One-time engagements, variable work' },
  { value: 'TRANSACTIONAL', label: 'Transactional', description: 'Per-transaction or per-unit sales' },
  { value: 'RECURRING_CONTRACTS', label: 'Recurring Contracts', description: 'Annual contracts, retainers' },
  { value: 'SUBSCRIPTION_SAAS', label: 'Subscription/SaaS', description: 'Monthly/annual subscriptions' },
]

const grossMarginOptions = [
  { value: 'LOW', label: 'Low (<30%)', description: 'High cost of goods sold' },
  { value: 'MODERATE', label: 'Moderate (30-50%)', description: 'Average margins' },
  { value: 'GOOD', label: 'Good (50-70%)', description: 'Healthy margins' },
  { value: 'EXCELLENT', label: 'Excellent (>70%)', description: 'Premium margins' },
]

const laborIntensityOptions = [
  { value: 'LOW', label: 'Low', description: 'Automated or asset-driven business' },
  { value: 'MODERATE', label: 'Moderate', description: 'Balanced labor and automation' },
  { value: 'HIGH', label: 'High', description: 'Labor is primary value driver' },
  { value: 'VERY_HIGH', label: 'Very High', description: 'Highly dependent on skilled labor' },
]

const assetIntensityOptions = [
  { value: 'ASSET_LIGHT', label: 'Asset Light', description: 'Minimal physical assets required' },
  { value: 'MODERATE', label: 'Moderate', description: 'Some equipment or inventory' },
  { value: 'ASSET_HEAVY', label: 'Asset Heavy', description: 'Significant capital equipment' },
]

const ownerInvolvementOptions = [
  { value: 'MINIMAL', label: 'Minimal', description: 'Business runs independently' },
  { value: 'LOW', label: 'Low', description: 'Strategic oversight only' },
  { value: 'MODERATE', label: 'Moderate', description: 'Involved in key decisions' },
  { value: 'HIGH', label: 'High', description: 'Active in daily operations' },
  { value: 'CRITICAL', label: 'Critical', description: 'Business depends on owner' },
]

interface FactorSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; description: string }>
  helpText?: string
}

function FactorSelect({ label, value, onChange, options, helpText }: FactorSelectProps) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helpText && <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>}
    </div>
  )
}

export function CoreFactorsStep({ formData, updateFormData }: CoreFactorsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Business Profile</h2>
        <p className="text-sm text-muted-foreground mb-6">
          These factors help us calculate your Core Score, which affects your valuation multiple.
          Be honest - accurate inputs lead to better insights.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FactorSelect
          label="Revenue Size"
          value={formData.revenueSizeCategory}
          onChange={(value) => updateFormData({ revenueSizeCategory: value })}
          options={revenueSizeOptions}
          helpText="Based on your annual revenue"
        />

        <FactorSelect
          label="Revenue Model"
          value={formData.revenueModel}
          onChange={(value) => updateFormData({ revenueModel: value })}
          options={revenueModelOptions}
          helpText="How do you primarily generate revenue?"
        />

        <FactorSelect
          label="Gross Margin"
          value={formData.grossMarginProxy}
          onChange={(value) => updateFormData({ grossMarginProxy: value })}
          options={grossMarginOptions}
          helpText="Revenue minus cost of goods sold"
        />

        <FactorSelect
          label="Labor Intensity"
          value={formData.laborIntensity}
          onChange={(value) => updateFormData({ laborIntensity: value })}
          options={laborIntensityOptions}
          helpText="How dependent is the business on labor?"
        />

        <FactorSelect
          label="Asset Intensity"
          value={formData.assetIntensity}
          onChange={(value) => updateFormData({ assetIntensity: value })}
          options={assetIntensityOptions}
          helpText="Level of capital assets required"
        />

        <FactorSelect
          label="Owner Involvement"
          value={formData.ownerInvolvement}
          onChange={(value) => updateFormData({ ownerInvolvement: value })}
          options={ownerInvolvementOptions}
          helpText="How critical is the owner to operations?"
        />
      </div>

      <div className="mt-6 p-4 bg-accent-light rounded-lg border border-primary/20">
        <h3 className="text-sm font-medium text-primary mb-2">Why These Matter</h3>
        <p className="text-sm text-primary">
          Buyers pay premiums for businesses with recurring revenue, high margins,
          low owner dependence, and scalable operations. These factors directly
          impact your valuation multiple.
        </p>
      </div>
    </div>
  )
}
