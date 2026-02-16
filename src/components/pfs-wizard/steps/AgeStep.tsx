'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PFSWizardStepProps } from '../PFSWizardTypes'

export function AgeStep({ data, onUpdate, onNext }: PFSWizardStepProps) {
  const canProceed = data.currentAge !== null && data.currentAge >= 18 && data.maritalStatus !== null

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-1">
          About You
        </h3>
        <p className="text-sm text-muted-foreground">
          Just two quick questions to get started.
        </p>
      </div>

      {/* Age */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          How old are you?
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ currentAge: Math.max(18, (data.currentAge || 50) - 1) })}
            disabled={data.currentAge !== null && data.currentAge <= 18}
            className="w-10 h-10 rounded-lg border border-input hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors flex items-center justify-center text-foreground font-medium text-lg"
          >
            -
          </button>
          <Input
            type="text"
            inputMode="numeric"
            value={data.currentAge !== null ? String(data.currentAge) : ''}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              if (!v) { onUpdate({ currentAge: null }); return }
              onUpdate({ currentAge: Math.min(100, Math.max(18, parseInt(v))) })
            }}
            placeholder="e.g. 52"
            className="w-20 h-10 text-center text-lg font-semibold"
          />
          <button
            type="button"
            onClick={() => onUpdate({ currentAge: Math.min(100, (data.currentAge || 49) + 1) })}
            disabled={data.currentAge !== null && data.currentAge >= 100}
            className="w-10 h-10 rounded-lg border border-input hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors flex items-center justify-center text-foreground font-medium text-lg"
          >
            +
          </button>
        </div>
        {data.currentAge !== null && (data.currentAge < 18 || data.currentAge > 100) && (
          <p className="text-xs text-destructive">Please enter your age (18-100)</p>
        )}
      </div>

      {/* Marital Status */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Marital status
        </label>
        <div className="flex gap-3">
          {(['single', 'married'] as const).map((status) => (
            <motion.button
              key={status}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onUpdate({ maritalStatus: status })}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                data.maritalStatus === status
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
            >
              {status === 'single' ? 'Single' : 'Married'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <div className="pt-4">
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
