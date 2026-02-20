'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import styles from '@/components/financials/financials-pages.module.css'

export function AgeStep({ data, onUpdate, onNext }: PFSWizardStepProps) {
  const canProceed = data.currentAge !== null && data.currentAge >= 18 && data.maritalStatus !== null

  return (
    <div className={styles.pfsStep}>
      <div>
        <h3 className={styles.pfsStepTitle}>About You</h3>
        <p className={styles.pfsStepSubtitle}>Just two quick questions to get started.</p>
      </div>

      {/* Age */}
      <div className={styles.pfsFieldGroup}>
        <label className={styles.pfsFieldLabel}>How old are you?</label>
        <Input
          type="text"
          inputMode="numeric"
          value={data.currentAge !== null ? String(data.currentAge) : ''}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
            if (!v) { onUpdate({ currentAge: null }); return }
            onUpdate({ currentAge: parseInt(v) })
          }}
          onBlur={() => {
            if (data.currentAge !== null) {
              onUpdate({ currentAge: Math.min(100, Math.max(18, data.currentAge)) })
            }
          }}
          placeholder="55"
          className="w-24 h-11 text-lg font-semibold"
        />
        {data.currentAge !== null && (data.currentAge < 18 || data.currentAge > 100) && (
          <p className={styles.pfsFieldError}>Please enter your age (18-100)</p>
        )}
      </div>

      {/* Marital Status */}
      <div className={styles.pfsFieldGroup}>
        <label className={styles.pfsFieldLabel}>Marital status</label>
        <div className={styles.pfsToggleGroup}>
          {(['single', 'married'] as const).map((status) => (
            <motion.button
              key={status}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onUpdate({ maritalStatus: status })}
              className={`${styles.pfsToggleBtn} ${data.maritalStatus === status ? styles.pfsToggleBtnActive : ''}`}
            >
              {status === 'single' ? 'Single' : 'Married'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <div className={styles.pfsContinueWrap}>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full py-6 text-base"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
