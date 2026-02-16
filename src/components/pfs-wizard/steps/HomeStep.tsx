'use client'

import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PFSWizardStepProps } from '../PFSWizardTypes'
import { formatInputValue, parseInputValue } from '../pfs-wizard-utils'

interface HomeStepProps extends PFSWizardStepProps {
  onSkip: () => void
}

export function HomeStep({ data, onUpdate, onNext, onBack, onSkip }: HomeStepProps) {
  const canProceed =
    data.ownsHome === false ||
    (data.ownsHome === true && data.homeValue > 0)

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-1">
          Home & Real Estate
        </h3>
        <p className="text-sm text-muted-foreground">
          Your largest personal asset is often your home.
        </p>
      </div>

      {/* Own a home? */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Do you own a home?
        </label>
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <motion.button
              key={String(val)}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onUpdate({
                ownsHome: val,
                ...(!val && { homeValue: 0, mortgageBalance: 0 }),
              })}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                data.ownsHome === val
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
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
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Approximate home value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(data.homeValue)}
                  onChange={(e) => onUpdate({ homeValue: parseInputValue(e.target.value) })}
                  placeholder="e.g. 500,000"
                  className="pl-7 h-11"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Mortgage balance
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(data.mortgageBalance)}
                  onChange={(e) => onUpdate({ mortgageBalance: parseInputValue(e.target.value) })}
                  placeholder="e.g. 300,000"
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
            className="space-y-3 overflow-hidden"
          >
            <label className="block text-sm font-medium text-foreground">
              Any other real estate?
            </label>
            <div className="flex gap-3">
              {([true, false] as const).map((val) => (
                <motion.button
                  key={`re-${val}`}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onUpdate({
                    hasOtherRealEstate: val,
                    ...(!val && { otherRealEstateValue: 0, otherRealEstateDebt: 0 }),
                  })}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    data.hasOtherRealEstate === val
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  }`}
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
                  className="space-y-4 overflow-hidden pt-2"
                >
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Total value of other real estate
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(data.otherRealEstateValue)}
                        onChange={(e) => onUpdate({ otherRealEstateValue: parseInputValue(e.target.value) })}
                        placeholder="e.g. 250,000"
                        className="pl-7 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Mortgage on other properties
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(data.otherRealEstateDebt)}
                        onChange={(e) => onUpdate({ otherRealEstateDebt: parseInputValue(e.target.value) })}
                        placeholder="e.g. 150,000"
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
