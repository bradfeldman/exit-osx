'use client'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CompanyFormData } from '../CompanySetupWizard'

interface BusinessProfileStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

const revenueModelOptions = [
  { value: 'PROJECT_BASED', label: 'Project-Based', icon: '📋', description: 'One-time engagements' },
  { value: 'TRANSACTIONAL', label: 'Transactional', icon: '💳', description: 'Per-unit sales' },
  { value: 'RECURRING_CONTRACTS', label: 'Contracts', icon: '📄', description: 'Annual retainers' },
  { value: 'SUBSCRIPTION_SAAS', label: 'Subscription', icon: '🔄', description: 'Recurring billing' },
]

const grossMarginOptions = [
  { value: 'LOW', label: 'Low', sublabel: '<30%', description: 'High COGS' },
  { value: 'MODERATE', label: 'Moderate', sublabel: '30-50%', description: 'Average' },
  { value: 'GOOD', label: 'Good', sublabel: '50-70%', description: 'Healthy' },
  { value: 'EXCELLENT', label: 'Excellent', sublabel: '>70%', description: 'Premium' },
]

const laborIntensityOptions = [
  { value: 'LOW', label: 'Low', description: 'Automated/asset-driven' },
  { value: 'MODERATE', label: 'Moderate', description: 'Balanced' },
  { value: 'HIGH', label: 'High', description: 'Labor-driven' },
  { value: 'VERY_HIGH', label: 'Very High', description: 'Highly dependent' },
]

const assetIntensityOptions = [
  { value: 'ASSET_LIGHT', label: 'Light', description: 'Minimal assets' },
  { value: 'MODERATE', label: 'Moderate', description: 'Some equipment' },
  { value: 'ASSET_HEAVY', label: 'Heavy', description: 'Capital intensive' },
]

const ownerInvolvementOptions = [
  { value: 'MINIMAL', label: 'Minimal', description: 'Runs independently' },
  { value: 'LOW', label: 'Low', description: 'Strategic only' },
  { value: 'MODERATE', label: 'Moderate', description: 'Key decisions' },
  { value: 'HIGH', label: 'High', description: 'Daily operations' },
  { value: 'CRITICAL', label: 'Critical', description: 'Owner dependent' },
]

// Examples for tooltips
const categoryExamples = {
  revenueModel: [
    { label: 'Project-Based', examples: 'Construction, web design, consulting projects' },
    { label: 'Transactional', examples: 'Retail stores, restaurants, e-commerce' },
    { label: 'Contracts', examples: 'IT services, janitorial, landscaping contracts' },
    { label: 'Subscription', examples: 'SaaS, gym memberships, streaming services' },
  ],
  grossMargin: [
    { label: 'Low (<30%)', examples: 'Grocery stores, gas stations, distribution' },
    { label: 'Moderate (30-50%)', examples: 'Retail, restaurants, manufacturing' },
    { label: 'Good (50-70%)', examples: 'Professional services, specialty retail' },
    { label: 'Excellent (>70%)', examples: 'Software, consulting, digital products' },
  ],
  laborIntensity: [
    { label: 'Low', examples: 'Vending machines, rental properties, software' },
    { label: 'Moderate', examples: 'Retail with some automation, light manufacturing' },
    { label: 'High', examples: 'Restaurants, retail stores, healthcare' },
    { label: 'Very High', examples: 'Staffing agencies, home care, cleaning services' },
  ],
  assetIntensity: [
    { label: 'Light', examples: 'Consulting, marketing agencies, software companies' },
    { label: 'Moderate', examples: 'Retail stores, restaurants, medical offices' },
    { label: 'Heavy', examples: 'Manufacturing, trucking, airlines, construction' },
  ],
  ownerInvolvement: [
    { label: 'Minimal', examples: 'Franchise with manager, mature business with CEO' },
    { label: 'Low', examples: 'Owner sets strategy, strong management team runs operations' },
    { label: 'Moderate', examples: 'Owner makes key decisions, delegates daily tasks' },
    { label: 'High', examples: 'Owner manages staff, involved in daily operations' },
    { label: 'Critical', examples: 'Solo practitioner, owner IS the product/service' },
  ],
}

interface OptionCardProps {
  selected: boolean
  onClick: () => void
  label: string
  sublabel?: string
  description?: string
  icon?: string
  compact?: boolean
}

function OptionCard({ selected, onClick, label, sublabel, description, icon, compact }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200',
        compact ? 'p-3 min-h-[70px]' : 'p-4 min-h-[90px]',
        selected
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
      )}
    >
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
      )}
      {icon && <span className="text-xl mb-1">{icon}</span>}
      <span className={cn(
        'font-medium text-foreground',
        compact ? 'text-sm' : 'text-sm'
      )}>{label}</span>
      {sublabel && (
        <span className="text-xs text-muted-foreground font-medium">{sublabel}</span>
      )}
      {description && (
        <span className={cn(
          'text-muted-foreground mt-0.5 text-center leading-tight',
          compact ? 'text-[10px]' : 'text-xs'
        )}>{description}</span>
      )}
    </button>
  )
}

interface FactorSectionProps {
  title: string
  description?: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; sublabel?: string; description?: string; icon?: string }>
  columns?: number
  compact?: boolean
  examples?: Array<{ label: string; examples: string }>
}

function FactorSection({ title, description, value, onChange, options, columns = 4, compact = false, examples }: FactorSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {examples && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Examples:</p>
                  {examples.map((ex) => (
                    <div key={ex.label} className="text-xs">
                      <span className="font-medium">{ex.label}:</span>{' '}
                      <span className="text-muted-foreground">{ex.examples}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(columns, options.length)}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <OptionCard
            key={option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            label={option.label}
            sublabel={option.sublabel}
            description={option.description}
            icon={option.icon}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}

export function BusinessProfileStep({ formData, updateFormData }: BusinessProfileStepProps) {
  const completedCount = [
    formData.revenueModel,
    formData.grossMarginProxy,
    formData.laborIntensity,
    formData.assetIntensity,
    formData.ownerInvolvement,
  ].filter(Boolean).length

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-8">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Business Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select the option that best describes your business
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <span className="text-sm font-medium text-foreground">{completedCount}/5</span>
          <div className="w-16 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${(completedCount / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Factor Sections */}
      <div className="space-y-6">
        <FactorSection
          title="Revenue Model"
          description="How does your business generate income from customers?"
          value={formData.revenueModel}
          onChange={(value) => updateFormData({ revenueModel: value })}
          options={revenueModelOptions}
          columns={4}
          examples={categoryExamples.revenueModel}
        />

        <FactorSection
          title="Gross Margin"
          description="How profitable is each sale before overhead, salaries, and other operating expenses?"
          value={formData.grossMarginProxy}
          onChange={(value) => updateFormData({ grossMarginProxy: value })}
          options={grossMarginOptions}
          columns={4}
          examples={categoryExamples.grossMargin}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FactorSection
            title="Labor Intensity"
            description="How dependent is your business on employee labor?"
            value={formData.laborIntensity}
            onChange={(value) => updateFormData({ laborIntensity: value })}
            options={laborIntensityOptions}
            columns={2}
            compact
            examples={categoryExamples.laborIntensity}
          />

          <FactorSection
            title="Asset Intensity"
            description="How much physical equipment or property is required?"
            value={formData.assetIntensity}
            onChange={(value) => updateFormData({ assetIntensity: value })}
            options={assetIntensityOptions}
            columns={3}
            compact
            examples={categoryExamples.assetIntensity}
          />
        </div>

        <FactorSection
          title="Owner Involvement"
          description="How involved is the owner in day-to-day operations?"
          value={formData.ownerInvolvement}
          onChange={(value) => updateFormData({ ownerInvolvement: value })}
          options={ownerInvolvementOptions}
          columns={5}
          compact
          examples={categoryExamples.ownerInvolvement}
        />
      </div>

      {/* Info card - only show when all completed */}
      {completedCount === 5 && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">All factors selected</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                These factors will calculate your Core Score, which affects your valuation multiple.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
