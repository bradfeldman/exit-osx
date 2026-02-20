'use client'

import Link from 'next/link'
import { CORE_FACTOR_SCORES } from '@/lib/valuation/calculate-valuation'
import { ChevronRight } from 'lucide-react'

const FACTOR_LABELS: Record<string, string> = {
  revenueModel: 'Revenue Model',
  grossMarginProxy: 'Gross Margin',
  laborIntensity: 'Labor Intensity',
  assetIntensity: 'Asset Intensity',
  ownerInvolvement: 'Owner Involvement',
}

const FACTOR_VALUE_LABELS: Record<string, Record<string, string>> = {
  revenueModel: {
    PROJECT_BASED: 'Project-Based',
    TRANSACTIONAL: 'Transactional',
    RECURRING_CONTRACTS: 'Recurring Contracts',
    SUBSCRIPTION_SAAS: 'Subscription / SaaS',
  },
  grossMarginProxy: {
    LOW: 'Low (<30%)',
    MODERATE: 'Moderate (30-50%)',
    GOOD: 'Good (50-70%)',
    EXCELLENT: 'Excellent (>70%)',
  },
  laborIntensity: {
    VERY_HIGH: 'Very High',
    HIGH: 'High',
    MODERATE: 'Moderate',
    LOW: 'Low',
  },
  assetIntensity: {
    ASSET_HEAVY: 'Asset Heavy',
    MODERATE: 'Moderate',
    ASSET_LIGHT: 'Asset Light',
  },
  ownerInvolvement: {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MODERATE: 'Moderate',
    LOW: 'Low',
    MINIMAL: 'Minimal',
  },
}

/** What a buyer thinks when they see each factor at different levels */
const FACTOR_BUYER_CONTEXT: Record<string, Record<string, string>> = {
  revenueModel: {
    PROJECT_BASED: 'Buyers may see unpredictable cash flow - harder to forecast',
    TRANSACTIONAL: 'Revenue depends on ongoing sales effort',
    RECURRING_CONTRACTS: 'Predictable revenue stream — buyers pay more for this',
    SUBSCRIPTION_SAAS: 'Highly predictable — the most valued revenue type',
  },
  grossMarginProxy: {
    LOW: 'Thin margins limit growth potential and buyer interest',
    MODERATE: 'Acceptable margins — may be room to improve',
    GOOD: 'Healthy margins signal a strong business model',
    EXCELLENT: 'Premium margins — very attractive to buyers',
  },
  laborIntensity: {
    VERY_HIGH: 'Heavy reliance on people makes scaling expensive',
    HIGH: 'Buyer sees significant labor costs that may compress value',
    MODERATE: 'Balanced — manageable labor cost structure',
    LOW: 'Lean operation — scales efficiently',
  },
  assetIntensity: {
    ASSET_HEAVY: 'Capital-intensive — requires ongoing investment to maintain',
    MODERATE: 'Some capital required — typical for your industry',
    ASSET_LIGHT: 'Minimal capital needs — more cash flow available to buyer',
  },
  ownerInvolvement: {
    CRITICAL: 'Business may not survive the transition — biggest risk for buyers',
    HIGH: 'Buyer needs to replace you — adds cost and risk',
    MODERATE: 'Some transition needed, but manageable',
    LOW: 'Business runs with limited owner input — attractive',
    MINIMAL: 'Fully systematized — ideal for acquisition',
  },
}

type ImpactLevel = 'helping' | 'neutral' | 'limiting'

function getImpactLevel(score: number): ImpactLevel {
  if (score >= 0.75) return 'helping'
  if (score >= 0.5) return 'neutral'
  return 'limiting'
}

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; className: string }> = {
  helping: {
    label: 'Helping',
    className: 'bg-green-light text-green-dark dark:bg-green-dark/30 dark:text-green',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary',
  },
  limiting: {
    label: 'Limiting',
    className: 'bg-orange-light text-orange-dark dark:bg-orange-dark/30 dark:text-orange',
  },
}

interface CoreScoreCardProps {
  coreFactors: {
    revenueModel: string
    grossMarginProxy: string
    laborIntensity: string
    assetIntensity: string
    ownerInvolvement: string
    coreScore: number | null
  }
  multipleRange: { low: number; high: number }
  finalMultiple: number
}

export function CoreScoreCard({ coreFactors }: CoreScoreCardProps) {
  const coreScore = coreFactors.coreScore
  if (coreScore === null) return null

  const factors = ['revenueModel', 'grossMarginProxy', 'laborIntensity', 'assetIntensity', 'ownerInvolvement'] as const

  const limitingCount = factors.filter(f => {
    const score = CORE_FACTOR_SCORES[f]?.[coreFactors[f]] ?? 0.5
    return getImpactLevel(score) === 'limiting'
  }).length

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">What Drives Your Multiple</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          These five structural factors determine where buyers start when valuing your business.
        </p>
      </div>

      {/* Factor rows */}
      <div className="space-y-1">
        {factors.map(factor => {
          const value = coreFactors[factor]
          const score = CORE_FACTOR_SCORES[factor]?.[value] ?? 0.5
          const label = FACTOR_LABELS[factor]
          const valueLabel = FACTOR_VALUE_LABELS[factor]?.[value] ?? value
          const impact = getImpactLevel(score)
          const config = IMPACT_CONFIG[impact]
          const buyerContext = FACTOR_BUYER_CONTEXT[factor]?.[value] ?? ''

          return (
            <div key={factor} className="py-3 border-b border-border last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{valueLabel}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${config.className}`}>
                  {config.label}
                </span>
              </div>
              {buyerContext && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{buyerContext}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer — bridge to What-If Scenarios */}
      {limitingCount > 0 && (
        <div className="mt-4 pt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            {limitingCount} factor{limitingCount > 1 ? 's' : ''} limiting your multiple.
          </span>
          <a href="#what-if-scenarios" className="hidden sm:inline-flex items-center gap-0.5 text-primary hover:underline font-medium">
            Model improvements
            <ChevronRight className="w-3 h-3" />
          </a>
          <Link href="/dashboard/diagnosis" className="sm:hidden inline-flex items-center gap-0.5 text-primary hover:underline font-medium">
            Improve your score
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
