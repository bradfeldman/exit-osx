'use client'

import Link from 'next/link'
import { BookOpen, Clock, Lock, TrendingUp } from 'lucide-react'
import { type PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'
import { getPlaybookDisplaySlug } from '@/lib/playbook/playbook-surface-mapping'
import { getPlaybookAccessStatus } from '@/lib/subscriptions/playbook-access'
import { formatCurrency } from '@/lib/utils/currency'
import type { PlanTier } from '@/lib/pricing'

interface RankedPlaybook {
  playbook: PlaybookDefinition
  relevanceScore: number
  estimatedImpactLow: number
  estimatedImpactHigh: number
}

interface PostAssessmentPlaybooksProps {
  playbooks: RankedPlaybook[]
  planTier: PlanTier
  onDismiss?: () => void
}

const DIFFICULTY_LABELS: Record<string, string> = {
  NONE: 'Quick start',
  LOW: 'Easy',
  MEDIUM: 'Moderate',
  HIGH: 'Advanced',
  VERY_HIGH: 'Complex',
}

export function PostAssessmentPlaybooks({
  playbooks,
  planTier,
  onDismiss,
}: PostAssessmentPlaybooksProps) {
  if (playbooks.length === 0) return null

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            Your Top Playbooks
          </h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Based on your assessment, these playbooks will have the biggest impact on your exit readiness.
      </p>

      <div className="space-y-3">
        {playbooks.map(({ playbook, estimatedImpactLow, estimatedImpactHigh }, index) => {
          const slug = getPlaybookDisplaySlug(playbook)
          const access = getPlaybookAccessStatus(slug, planTier)
          const isLocked = access !== 'full'

          return (
            <Link
              key={slug}
              href={isLocked ? '/dashboard/settings?tab=billing' : `/playbook/${slug.toLowerCase()}/1`}
              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              {/* Rank number */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {playbook.title}
                  </p>
                  {isLocked && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-light text-orange-dark dark:bg-orange-dark/30 dark:text-orange shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      Growth
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {playbook.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{DIFFICULTY_LABELS[playbook.difficulty] ?? playbook.difficulty}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {playbook.durationLow}-{playbook.durationHigh}mo
                  </span>
                  {estimatedImpactLow > 0 && (
                    <span className="flex items-center gap-1 text-green-dark">
                      <TrendingUp className="w-3 h-3" />
                      {formatCurrency(estimatedImpactLow)}-{formatCurrency(estimatedImpactHigh)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        href="/dashboard/playbook"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-4"
      >
        See all 44 playbooks →
      </Link>
    </div>
  )
}
