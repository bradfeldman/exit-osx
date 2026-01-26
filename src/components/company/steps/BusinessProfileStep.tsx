'use client'

import { motion } from 'framer-motion'
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

// Note: grossMargin is now collected in Business Fundamentals assessment, not onboarding

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
  index?: number
}

function OptionCard({ selected, onClick, label, sublabel, description, icon, compact, index = 0 }: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200',
        compact ? 'p-3 min-h-[75px]' : 'p-4 min-h-[100px]',
        selected
          ? 'border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/20'
          : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-md'
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-primary to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-primary/40"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </motion.div>
      )}
      {icon && (
        <motion.span
          animate={{ scale: selected ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={cn("mb-1.5", compact ? "text-xl" : "text-2xl")}
        >
          {icon}
        </motion.span>
      )}
      <span className={cn(
        'font-semibold',
        compact ? 'text-sm' : 'text-sm',
        selected ? 'text-primary' : 'text-foreground'
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
    </motion.button>
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
  delay?: number
}

function FactorSection({ title, description, value, onChange, options, columns = 4, compact = false, examples, delay = 0 }: FactorSectionProps) {
  const isSelected = value !== ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {examples && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
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
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-5 h-5 bg-gradient-to-br from-primary to-amber-600 rounded-full flex items-center justify-center shadow-md shadow-primary/30"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </motion.div>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground -mt-1">{description}</p>
      )}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${Math.min(columns, options.length)}, minmax(0, 1fr))` }}
      >
        {options.map((option, idx) => (
          <OptionCard
            key={option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            label={option.label}
            sublabel={option.sublabel}
            description={option.description}
            icon={option.icon}
            compact={compact}
            index={idx}
          />
        ))}
      </div>
    </motion.div>
  )
}

export function BusinessProfileStep({ formData, updateFormData }: BusinessProfileStepProps) {
  const completedCount = [
    formData.revenueModel,
    formData.laborIntensity,
    formData.assetIntensity,
    formData.ownerInvolvement,
  ].filter(Boolean).length

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-8">
      {/* Header with progress */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Business Profile
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Select the option that best describes your business
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 bg-gradient-to-r from-muted to-muted/50 rounded-full px-4 py-2 border border-border/50"
        >
          <span className="text-sm font-bold text-foreground">{completedCount}/4</span>
          <div className="w-20 h-2.5 bg-muted-foreground/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / 4) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Factor Sections */}
      <div className="space-y-7">
        <FactorSection
          title="Revenue Model"
          description="How does your business generate income from customers?"
          value={formData.revenueModel}
          onChange={(value) => updateFormData({ revenueModel: value })}
          options={revenueModelOptions}
          columns={4}
          examples={categoryExamples.revenueModel}
          delay={0.1}
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
            delay={0.2}
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
            delay={0.25}
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
          delay={0.3}
        />
      </div>

      {/* Info card - only show when all completed */}
      {completedCount === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative overflow-hidden p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/5 rounded-2xl border border-primary/30 shadow-lg shadow-primary/10"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-12 h-12 bg-gradient-to-br from-primary to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </motion.div>
            <div>
              <h3 className="text-base font-bold text-foreground">All factors selected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                These factors will calculate your Core Score, which affects your valuation multiple.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
    </TooltipProvider>
  )
}
