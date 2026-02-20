'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'
import styles from '@/components/financials/financials-pages.module.css'

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
    <div className={styles.pfsStep}>
      <div>
        <h3 className={styles.pfsStepTitle}>Other Assets</h3>
        <p className={styles.pfsStepSubtitle}>Approximate values are fine. All fields are optional.</p>
      </div>

      <div className={styles.pfsFieldGroupGap}>
        {FIELDS.map((field) => (
          <div key={field.key} className={styles.pfsFieldGroupSm}>
            <label className={styles.pfsFieldLabel}>{field.label}</label>
            <div className={styles.pfsCurrencyWrap}>
              <span className={styles.pfsCurrencySymbol}>$</span>
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
      <div className={styles.pfsNavRow}>
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className={styles.pfsNavSpacer} />
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">Skip</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  )
}
