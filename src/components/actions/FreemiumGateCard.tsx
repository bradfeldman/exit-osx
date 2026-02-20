'use client'

import { Lock, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

interface FreemiumGateCardProps {
  lockedTaskCount: number
  lockedValueTotal: number
  onUpgrade: () => void
}

export function FreemiumGateCard({ lockedTaskCount, lockedValueTotal, onUpgrade }: FreemiumGateCardProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-[var(--burnt-orange)]/30 bg-[var(--burnt-orange)]/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--burnt-orange)]/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-[var(--burnt-orange)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Upgrade to Continue
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {lockedTaskCount} more item{lockedTaskCount !== 1 ? 's' : ''} could recover ~{formatCurrency(lockedValueTotal)} in enterprise value.
          </p>

          <ul className="mt-3 space-y-1.5">
            <li className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--burnt-orange)] shrink-0" />
              Full action plan with all prioritized tasks
            </li>
            <li className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--burnt-orange)] shrink-0" />
              Personalized buyer risk context on every task
            </li>
            <li className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--burnt-orange)] shrink-0" />
              Evidence tracking and proof documents
            </li>
          </ul>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--burnt-orange)] text-white hover:bg-[var(--burnt-orange)]/90 transition-colors"
            >
              Upgrade to Growth &mdash; $129/mo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <a href="mailto:support@exitosx.com" className="underline hover:text-foreground transition-colors">
              Questions? Talk to us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
