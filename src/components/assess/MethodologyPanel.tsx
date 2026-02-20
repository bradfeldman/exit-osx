'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from '@/lib/motion'
import { X } from 'lucide-react'

interface MethodologyPanelProps {
  open: boolean
  onClose: () => void
  industryName?: string | null
  multipleRange?: { low: number; high: number }
  briScore: number
}

export function MethodologyPanel({
  open,
  onClose,
  industryName,
  multipleRange,
  briScore,
}: MethodologyPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Trap focus inside panel
  useEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (el) el.focus()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-card border-l border-border overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Valuation methodology"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-foreground">
                How we calculated this
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Industry Multiple */}
              <section>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                  Industry Multiple
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We source EBITDA multiples from public transaction databases and adjust for company size.
                  {industryName && (
                    <> For <strong>{industryName}</strong> businesses, the typical range is{' '}
                      {multipleRange
                        ? <strong>{multipleRange.low.toFixed(1)}x &ndash; {multipleRange.high.toFixed(1)}x EBITDA</strong>
                        : 'based on comparable transactions'
                      }.
                    </>
                  )}
                </p>
              </section>

              {/* BRI-to-Multiple Mapping */}
              <section>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                  Readiness Adjustment
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your Buyer Readiness Index ({briScore}/100) adjusts the industry multiple up or down.
                  Higher scores reflect lower buyer risk, which commands a premium.
                  Lower scores indicate risk areas that buyers would discount.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-light dark:bg-green-dark/20 rounded-lg p-2.5">
                    <span className="font-semibold text-green-dark dark:text-green">85+</span>
                    <span className="text-muted-foreground ml-1">Premium multiple</span>
                  </div>
                  <div className="bg-primary/5 dark:bg-primary/20 rounded-lg p-2.5">
                    <span className="font-semibold text-primary dark:text-primary">70–84</span>
                    <span className="text-muted-foreground ml-1">At or near industry median</span>
                  </div>
                  <div className="bg-orange-light dark:bg-orange-dark/20 rounded-lg p-2.5">
                    <span className="font-semibold text-orange-dark dark:text-orange">55–69</span>
                    <span className="text-muted-foreground ml-1">Below median, addressable gaps</span>
                  </div>
                  <div className="bg-red-light dark:bg-red-dark/20 rounded-lg p-2.5">
                    <span className="font-semibold text-red-dark dark:text-red">&#60;55</span>
                    <span className="text-muted-foreground ml-1">Significant risk discount</span>
                  </div>
                </div>
              </section>

              {/* Data Limitations */}
              <section>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                  Data Limitations
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This estimate uses your revenue band and an industry-typical EBITDA margin.
                  Actual enterprise value depends on your real financials, growth trajectory,
                  customer concentration, and dozens of other factors only visible in due diligence.
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  As you add more detail to your profile, we refine this estimate with
                  actual EBITDA, owner compensation adjustments, and deal-specific risk discounts.
                </p>
              </section>

              {/* Legal Disclaimer */}
              <section className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                  Disclaimer
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This valuation estimate is for informational purposes only and does not constitute
                  a formal business appraisal, financial advice, or an offer to purchase.
                  Actual transaction values depend on market conditions, buyer preferences, due diligence
                  findings, and negotiation. Consult a qualified business appraiser or M&amp;A advisor
                  for a formal valuation opinion.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
