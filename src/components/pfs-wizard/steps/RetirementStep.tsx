'use client'

import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { detectTaxTreatment } from '@/lib/retirement/account-type-detector'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'
import styles from '@/components/financials/financials-pages.module.css'

// Tax treatment -> CSS module class mapping
const TAX_BADGE_CLASS: Record<string, string> = {
  tax_free: styles.pfsTaxBadgeFree,
  tax_deferred: styles.pfsTaxBadgeDeferred,
  capital_gains: styles.pfsTaxBadgeCapGains,
  already_taxed: styles.pfsTaxBadgeTaxed,
}

const TAX_BADGE_LABEL: Record<string, string> = {
  tax_free: 'Tax-free',
  tax_deferred: 'Tax-deferred',
  capital_gains: 'Capital gains',
  already_taxed: 'Already taxed',
}

interface RetirementStepProps extends PFSWizardStepProps {
  onSkip: () => void
}

export function RetirementStep({ data, onUpdate, onNext, onBack, onSkip }: RetirementStepProps) {
  const canProceed =
    data.hasRetirementAccounts === false ||
    (data.hasRetirementAccounts === true && data.retirementAccounts.length > 0)

  function addAccount() {
    onUpdate({
      retirementAccounts: [
        ...data.retirementAccounts,
        { id: `ret-${Date.now()}`, name: '', value: 0 },
      ],
    })
  }

  function updateAccount(id: string, field: 'name' | 'value', value: string | number) {
    onUpdate({
      retirementAccounts: data.retirementAccounts.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    })
  }

  function removeAccount(id: string) {
    onUpdate({
      retirementAccounts: data.retirementAccounts.filter(a => a.id !== id),
    })
  }

  return (
    <div className={styles.pfsStep}>
      <div>
        <h3 className={styles.pfsStepTitle}>Retirement Accounts</h3>
        <p className={styles.pfsStepSubtitle}>
          Many founders have most of their wealth in their business. Whatever you have is a great start.
        </p>
      </div>

      {/* Has retirement accounts? */}
      <div className={styles.pfsFieldGroup}>
        <label className={styles.pfsFieldLabel}>Do you have any retirement accounts?</label>
        <div className={styles.pfsToggleGroup}>
          {([true, false] as const).map((val) => (
            <motion.button
              key={String(val)}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onUpdate({
                  hasRetirementAccounts: val,
                  ...(val && data.retirementAccounts.length === 0 && {
                    retirementAccounts: [{ id: `ret-${Date.now()}`, name: '', value: 0 }],
                  }),
                  ...(!val && { retirementAccounts: [] }),
                })
              }}
              className={`${styles.pfsToggleBtn} ${data.hasRetirementAccounts === val ? styles.pfsToggleBtnActive : ''}`}
            >
              {val ? 'Yes' : 'No'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Account rows */}
      <AnimatePresence>
        {data.hasRetirementAccounts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.pfsCollapsible}
          >
            {data.retirementAccounts.map((account, index) => {
              const taxTreatment = account.name
                ? detectTaxTreatment(account.name, 'Retirement Accounts')
                : null
              const badgeClass = taxTreatment ? TAX_BADGE_CLASS[taxTreatment] : null
              const badgeLabel = taxTreatment ? TAX_BADGE_LABEL[taxTreatment] : null

              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className={styles.pfsWizardCard}
                >
                  <div className={styles.pfsWizardCardHeader}>
                    <span className={styles.pfsWizardCardLabel}>Account {index + 1}</span>
                    {data.retirementAccounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccount(account.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className={styles.pfsFieldGroup}>
                    <div className={styles.pfsAccountNameRow}>
                      <Input
                        type="text"
                        value={account.name}
                        onChange={(e) => updateAccount(account.id, 'name', e.target.value)}
                        placeholder="Roth IRA, 401(k), SEP IRA"
                        className="h-10 flex-1"
                        autoFocus={index === data.retirementAccounts.length - 1}
                      />
                      {badgeClass && badgeLabel && account.name && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`${styles.pfsTaxBadge} ${badgeClass}`}
                        >
                          {badgeLabel}
                        </motion.span>
                      )}
                    </div>
                    <div className={styles.pfsCurrencyWrap}>
                      <span className={styles.pfsCurrencySymbol}>$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(account.value)}
                        onChange={(e) => updateAccount(account.id, 'value', parseInputValue(e.target.value))}
                        placeholder="150,000"
                        className="pl-7 h-10"
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={addAccount}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another Account
            </Button>
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
