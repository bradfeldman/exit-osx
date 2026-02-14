'use client'

import Link from 'next/link'
import type { CompanyContextData } from '@/lib/playbook/rich-task-description'

interface CompanyContextBlockProps {
  companyContext: CompanyContextData | null | undefined
}

export function CompanyContextBlock({ companyContext }: CompanyContextBlockProps) {
  if (!companyContext) return null

  if (companyContext.dataQuality === 'HIGH') {
    return <HighTierBlock context={companyContext} />
  }

  if (companyContext.dataQuality === 'MODERATE') {
    return <ModerateTierBlock context={companyContext} />
  }

  return <LowTierBlock />
}

// ─── HIGH Tier: Full financials + benchmarks + dollar impact ────────────

function HighTierBlock({ context }: { context: CompanyContextData }) {
  return (
    <div className="mt-4 p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
      <p className="text-xs font-semibold tracking-wider text-emerald-700 dark:text-emerald-400 uppercase mb-3">
        YOUR NUMBERS
      </p>

      <div className="space-y-2.5">
        {/* Your situation */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-foreground">
            Your {context.yourSituation.metric}:{' '}
            <span className="font-semibold">{context.yourSituation.value}</span>
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {context.yourSituation.source}
          </span>
        </div>

        {/* Industry benchmark */}
        {context.industryBenchmark && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Industry range:{' '}
              <span className="font-medium text-foreground">{context.industryBenchmark.range}</span>
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {context.industryBenchmark.source}
            </span>
          </div>
        )}

        {/* Financial impact */}
        {context.financialImpact && (
          <div className="mt-2 pt-2 border-t border-emerald-200/30 dark:border-emerald-800/20 space-y-1">
            <p className="text-sm text-foreground font-medium">
              {context.financialImpact.gapDescription}
            </p>
            <p className="text-sm text-foreground">
              Impact: <span className="font-semibold">{context.financialImpact.dollarImpact}</span>
              {' → '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {context.financialImpact.enterpriseValueImpact}
              </span>
            </p>
            <p className="text-xs text-muted-foreground italic">
              Math: {context.financialImpact.calculation}
            </p>
          </div>
        )}

        {/* Context note */}
        {context.contextNote && (
          <p className="text-xs text-muted-foreground mt-1">
            {context.contextNote}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── MODERATE Tier: Categorical insights + CTA ──────────────────────────

function ModerateTierBlock({ context }: { context: CompanyContextData }) {
  return (
    <div className="mt-4 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
      <p className="text-xs font-semibold tracking-wider text-blue-700 dark:text-blue-400 uppercase mb-2">
        YOUR CONTEXT
      </p>

      <p className="text-sm text-foreground">
        {context.yourSituation.value}
      </p>

      {context.industryBenchmark && (
        <p className="text-sm text-muted-foreground mt-1">
          Industry benchmark: {context.industryBenchmark.range}
        </p>
      )}

      <p className="text-xs text-muted-foreground mt-2 italic">
        {context.contextNote}
      </p>

      {context.addFinancialsCTA && (
        <Link
          href="/dashboard/financials/statements"
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Add your financials to see dollar impact
          <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </div>
  )
}

// ─── LOW Tier: Blurred preview + CTA ────────────────────────────────────

function LowTierBlock() {
  return (
    <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/30 relative overflow-hidden">
      {/* Blurred preview */}
      <div className="blur-[3px] select-none pointer-events-none">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
          YOUR NUMBERS
        </p>
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">Your EBITDA Margin: ██.█%</p>
          <p className="text-sm text-muted-foreground">Industry range: ██-██%</p>
          <p className="text-sm text-muted-foreground">Impact: $███K → $█.██M enterprise value</p>
        </div>
      </div>

      {/* CTA overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
        <Link
          href="/dashboard/financials/statements"
          className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Add Your Financials
        </Link>
      </div>
    </div>
  )
}
