'use client'

import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { detectTaxTreatment } from '@/lib/retirement/account-type-detector'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'

const TAX_BADGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  tax_free: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Tax-free' },
  tax_deferred: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Tax-deferred' },
  capital_gains: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Capital gains' },
  already_taxed: { bg: 'bg-gray-100 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400', label: 'Already taxed' },
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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-1">
          Retirement Accounts
        </h3>
        <p className="text-sm text-muted-foreground">
          Many founders have most of their wealth in their business. Whatever you have is a great start.
        </p>
      </div>

      {/* Has retirement accounts? */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Do you have any retirement accounts?
        </label>
        <div className="flex gap-3">
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
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                data.hasRetirementAccounts === val
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
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
            className="space-y-3 overflow-hidden"
          >
            {data.retirementAccounts.map((account, index) => {
              const taxTreatment = account.name
                ? detectTaxTreatment(account.name, 'Retirement Accounts')
                : null
              const badge = taxTreatment ? TAX_BADGE_COLORS[taxTreatment] : null

              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 rounded-xl border border-border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      Account {index + 1}
                    </span>
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

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={account.name}
                        onChange={(e) => updateAccount(account.id, 'name', e.target.value)}
                        placeholder="Roth IRA, 401(k), SEP IRA"
                        className="h-10 flex-1"
                        autoFocus={index === data.retirementAccounts.length - 1}
                      />
                      {badge && account.name && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </motion.span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
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
      <div className="flex items-center gap-3 pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  )
}
