'use client'

import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'
import styles from '@/components/financials/financials-pages.module.css'

interface HomeStepProps extends PFSWizardStepProps {
  onSkip: () => void
}

export function HomeStep({ data, onUpdate, onNext, onBack, onSkip }: HomeStepProps) {
  const canProceed =
    data.ownsHome === false ||
    (data.ownsHome === true && data.homeValue >= 0)

  return (
    <div className={styles.pfsStep}>
      <div>
        <h3 className={styles.pfsStepTitle}>Home &amp; Real Estate</h3>
        <p className={styles.pfsStepSubtitle}>Your largest personal asset is often your home.</p>
      </div>

      {/* Own a home? */}
      <div className={styles.pfsFieldGroup}>
        <label className={styles.pfsFieldLabel}>Do you own a home?</label>
        <div className={styles.pfsToggleGroup}>
          {([true, false] as const).map((val) => (
            <motion.button
              key={String(val)}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onUpdate({
                ownsHome: val,
                ...(!val && { homeValue: 0, mortgageBalance: 0 }),
              })}
              className={`${styles.pfsToggleBtn} ${data.ownsHome === val ? styles.pfsToggleBtnActive : ''}`}
            >
              {val ? 'Yes' : 'No'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Home details */}
      <AnimatePresence>
        {data.ownsHome && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.pfsCollapsible}
          >
            <div className={styles.pfsFieldGroup}>
              <label className={styles.pfsFieldLabel}>Approximate home value</label>
              <div className={styles.pfsCurrencyWrap}>
                <span className={styles.pfsCurrencySymbol}>$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(data.homeValue)}
                  onChange={(e) => onUpdate({ homeValue: parseInputValue(e.target.value) })}
                  placeholder="500,000"
                  className="pl-7 h-11"
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.pfsFieldGroup}>
              <label className={styles.pfsFieldLabel}>
                Mortgage balance{' '}
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div className={styles.pfsCurrencyWrap}>
                <span className={styles.pfsCurrencySymbol}>$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(data.mortgageBalance)}
                  onChange={(e) => onUpdate({ mortgageBalance: parseInputValue(e.target.value) })}
                  placeholder="300,000"
                  className="pl-7 h-11"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other real estate */}
      <AnimatePresence>
        {data.ownsHome !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.pfsCollapsible}
          >
            <label className={styles.pfsFieldLabel}>Any other real estate?</label>
            <div className={styles.pfsToggleGroup}>
              {([true, false] as const).map((val) => (
                <motion.button
                  key={`re-${val}`}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onUpdate({
                    hasOtherRealEstate: val,
                    ...(!val && { otherRealEstateValue: 0, otherRealEstateDebt: 0 }),
                  })}
                  className={`${styles.pfsToggleBtn} ${data.hasOtherRealEstate === val ? styles.pfsToggleBtnActive : ''}`}
                >
                  {val ? 'Yes' : 'No'}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {data.hasOtherRealEstate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={styles.pfsCollapsible}
                  style={{ paddingTop: 8 }}
                >
                  <div className={styles.pfsFieldGroup}>
                    <label className={styles.pfsFieldLabel}>Total value of other real estate</label>
                    <div className={styles.pfsCurrencyWrap}>
                      <span className={styles.pfsCurrencySymbol}>$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(data.otherRealEstateValue)}
                        onChange={(e) => onUpdate({ otherRealEstateValue: parseInputValue(e.target.value) })}
                        placeholder="250,000"
                        className="pl-7 h-11"
                      />
                    </div>
                  </div>
                  <div className={styles.pfsFieldGroup}>
                    <label className={styles.pfsFieldLabel}>
                      Mortgage on other properties{' '}
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <div className={styles.pfsCurrencyWrap}>
                      <span className={styles.pfsCurrencySymbol}>$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(data.otherRealEstateDebt)}
                        onChange={(e) => onUpdate({ otherRealEstateDebt: parseInputValue(e.target.value) })}
                        placeholder="150,000"
                        className="pl-7 h-11"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.pfsNavRow}>
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className={styles.pfsNavSpacer} />
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">Skip</Button>
        <Button onClick={onNext} disabled={!canProceed}>Continue</Button>
      </div>
    </div>
  )
}
