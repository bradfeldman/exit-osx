'use client'

import Link from 'next/link'
import { BookOpen, Clock, TrendingUp, Lock, Sparkles } from 'lucide-react'
import { isFreePlaybook } from '@/lib/subscriptions/playbook-access'
import type { PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: 'Personal',
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operations',
  LEGAL: 'Legal',
  MARKET_GROWTH: 'Growth',
  DEAL_PREP: 'Deal Prep',
}

interface PlaybookCardProps {
  definition: PlaybookDefinition
  progress?: { percent: number; lastActive: string | null }
  planTier: string
  /** Show a recommendation rationale line */
  rationale?: string
}

export function PlaybookCard({ definition, progress, planTier, rationale }: PlaybookCardProps) {
  const isFree = isFreePlaybook(definition.slug)
  const isLocked = !isFree && planTier === 'foundation'
  const percent = progress?.percent ?? 0
  const category = CATEGORY_LABELS[definition.category] ?? definition.category

  return (
    <Link
      href={`/playbook/${definition.slug}`}
      className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow flex items-start gap-3"
      style={{ borderColor: 'var(--border, #E5E7EB)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: rationale ? 'var(--orange-light, #FFF6E8)' : 'var(--accent-light, #EBF5FF)' }}
      >
        {isLocked ? (
          <Lock className="w-4 h-4" style={{ color: 'var(--text-tertiary, #8E8E93)' }} />
        ) : rationale ? (
          <Sparkles className="w-4 h-4" style={{ color: 'var(--orange, #FF9500)' }} />
        ) : (
          <BookOpen className="w-4 h-4" style={{ color: 'var(--accent, #0071E3)' }} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
            {definition.title}
          </p>
          {isLocked && (
            <span
              className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted"
              style={{ color: 'var(--text-tertiary, #8E8E93)' }}
            >
              Growth
            </span>
          )}
        </div>

        {rationale && (
          <p className="text-xs mb-1 line-clamp-1" style={{ color: 'var(--orange, #FF9500)' }}>
            {rationale}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
            {category}
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
            <Clock className="w-3 h-3" />
            {definition.phases.length} sections
          </span>
          {definition.impactBaseLow > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--green, #34C759)' }}>
              <TrendingUp className="w-3 h-3" />
              ${Math.round(definition.impactBaseLow / 1000)}K+
            </span>
          )}
        </div>

        {percent > 0 && percent < 100 && (
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${percent}%`,
                backgroundColor: 'var(--accent, #0071E3)',
              }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}
