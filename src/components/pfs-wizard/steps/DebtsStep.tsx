'use client'

import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { DEBT_CATEGORIES } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'
import styles from '@/components/financials/financials-pages.module.css'

interface DebtsStepProps extends PFSWizardStepProps {
  onSkip: () => void
}

export function DebtsStep({ data, onUpdate, onNext, onBack, onSkip }: DebtsStepProps) {
  const canProceed =
    data.hasOtherDebts === false ||
    (data.hasOtherDebts === true && data.debts.length > 0)

  function addDebt() {
    onUpdate({
      debts: [
        ...data.debts,
        { id: `debt-${Date.now()}`, category: DEBT_CATEGORIES[0], amount: 0 },
      ],
    })
  }

  function updateDebt(id: string, field: 'category' | 'amount', value: string | number) {
    onUpdate({
      debts: data.debts.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      ),
    })
  }

  function removeDebt(id: string) {
    onUpdate({
      debts: data.debts.filter(d => d.id !== id),
    })
  }

  return (
    <div className={styles.pfsStep}>
      <div>
        <h3 className={styles.pfsStepTitle}>Other Debts</h3>
        <p className={styles.pfsStepSubtitle}>
          Most successful founders carry strategic debt while building value.
        </p>
      </div>

      {/* Has other debts? */}
      <div className={styles.pfsFieldGroup}>
        <label className={styles.pfsFieldLabel}>Any debts besides your mortgage?</label>
        <div className={styles.pfsToggleGroup}>
          {([true, false] as const).map((val) => (
            <motion.button
              key={String(val)}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onUpdate({
                  hasOtherDebts: val,
                  ...(val && data.debts.length === 0 && {
                    debts: [{ id: `debt-${Date.now()}`, category: DEBT_CATEGORIES[0], amount: 0 }],
                  }),
                  ...(!val && { debts: [] }),
                })
              }}
              className={`${styles.pfsToggleBtn} ${data.hasOtherDebts === val ? styles.pfsToggleBtnActive : ''}`}
            >
              {val ? 'Yes' : 'No'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Debt rows */}
      <AnimatePresence>
        {data.hasOtherDebts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.pfsCollapsible}
          >
            {data.debts.map((debt, index) => (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className={styles.pfsWizardCard}
              >
                <div className={styles.pfsWizardCardHeader}>
                  <span className={styles.pfsWizardCardLabel}>Debt {index + 1}</span>
                  {data.debts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDebt(debt.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className={styles.pfsWizardCardGrid}>
                  <Select
                    value={debt.category}
                    onValueChange={(value) => updateDebt(debt.id, 'category', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEBT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className={styles.pfsCurrencyWrap}>
                    <span className={styles.pfsCurrencySymbol}>$</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatInputValue(debt.amount)}
                      onChange={(e) => updateDebt(debt.id, 'amount', parseInputValue(e.target.value))}
                      placeholder="25,000"
                      className="pl-7 h-10"
                    />
                  </div>
                </div>
              </motion.div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addDebt}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another Debt
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.pfsNavRow}>
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className={styles.pfsNavSpacer} />
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">Skip</Button>
        <Button onClick={onNext} disabled={!canProceed}>See Your Snapshot</Button>
      </div>
    </div>
  )
}
