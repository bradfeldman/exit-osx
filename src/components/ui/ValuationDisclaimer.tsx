'use client'

import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const DISCLAIMER_TEXT =
  'Enterprise value estimate based on industry multiples and your Buyer Readiness Score. Actual transaction value depends on deal structure, market conditions, and due diligence. Not a formal appraisal.'

const METHODOLOGY_TEXT =
  'This estimate uses comparable EBITDA multiples for your industry, adjusted by your Buyer Readiness Score. It reflects enterprise value — what a buyer might pay for the business — not the net amount the seller receives after taxes, debt, and transaction costs.'

/**
 * Subtle valuation disclaimer shown below valuation displays.
 * Satisfies legal/trust requirement (2.10) without dominating the UI.
 */
export function ValuationDisclaimer({ className }: { className?: string }) {
  return (
    <p className={`text-[11px] text-muted-foreground/60 leading-relaxed ${className ?? ''}`}>
      {DISCLAIMER_TEXT}
    </p>
  )
}

/**
 * Small info icon that shows valuation methodology on hover/tap.
 * Place next to valuation numbers.
 */
export function ValuationInfoTip() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors ml-1"
            aria-label="Valuation methodology"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
          {METHODOLOGY_TEXT}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
