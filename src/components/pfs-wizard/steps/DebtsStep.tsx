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

interface DebtsStepProps extends PFSWizardStepProps {
  onSkip: () => void
}

export function DebtsStep({ data, onUpdate, onNext, onBack, onSkip }: DebtsStepProps) {
  const canProceed =
    data.hasOtherDebts === false ||
    (data.hasOtherDebts === true && data.debts.length > 0 &&
     data.debts.some(d => d.amount > 0))

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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-1">
          Other Debts
        </h3>
        <p className="text-sm text-muted-foreground">
          Most successful founders carry strategic debt while building value.
        </p>
      </div>

      {/* Has other debts? */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Any debts besides your mortgage?
        </label>
        <div className="flex gap-3">
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
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                data.hasOtherDebts === val
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
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
            className="space-y-3 overflow-hidden"
          >
            {data.debts.map((debt, index) => (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="p-4 rounded-xl border border-border bg-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    Debt {index + 1}
                  </span>
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

                <div className="grid grid-cols-2 gap-3">
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

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatInputValue(debt.amount)}
                      onChange={(e) => updateDebt(debt.id, 'amount', parseInputValue(e.target.value))}
                      placeholder="Amount owed"
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
      <div className="flex items-center gap-3 pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          See Your Snapshot
        </Button>
      </div>
    </div>
  )
}
