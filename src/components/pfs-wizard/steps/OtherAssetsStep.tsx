'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'

interface OtherAssetsStepProps extends PFSWizardStepProps {
  onSkip: () => void
}

const FIELDS = [
  { key: 'cashAndSavings' as const, label: 'Cash & Savings', placeholder: '50,000' },
  { key: 'investmentAccounts' as const, label: 'Investment Accounts', placeholder: '200,000' },
  { key: 'vehicles' as const, label: 'Vehicles', placeholder: '35,000' },
  { key: 'otherAssets' as const, label: 'Other Assets', placeholder: '10,000' },
]

export function OtherAssetsStep({ data, onUpdate, onNext, onBack, onSkip }: OtherAssetsStepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-1">
          Other Assets
        </h3>
        <p className="text-sm text-muted-foreground">
          Approximate values are fine. All fields are optional.
        </p>
      </div>

      <div className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {field.label}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatInputValue(data[field.key])}
                onChange={(e) => onUpdate({ [field.key]: parseInputValue(e.target.value) })}
                placeholder={field.placeholder}
                className="pl-7 h-11"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  )
}
