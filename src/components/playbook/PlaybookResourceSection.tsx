'use client'

import Link from 'next/link'
import { BookOpen, Clock, Lock, TrendingUp } from 'lucide-react'
import { type PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'
import { getPlaybookDisplaySlug } from '@/lib/playbook/playbook-surface-mapping'
import { getPlaybookAccessStatus } from '@/lib/subscriptions/playbook-access'
import { formatCurrency } from '@/lib/utils/currency'
import type { PlanTier } from '@/lib/pricing'

interface PlaybookResourceSectionProps {
  playbooks: { playbook: PlaybookDefinition; matchStrength: number; reason: string }[]
  planTier: PlanTier
  ebitda?: number
}

export function PlaybookResourceSection({ playbooks, planTier, ebitda }: PlaybookResourceSectionProps) {
  if (playbooks.length === 0) return null

  return (
    <div className="mt-5 pt-4 border-t border-border/50">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        Related Playbooks
      </p>
      <div className="space-y-3">
        {playbooks.map(({ playbook, reason }) => {
          const slug = getPlaybookDisplaySlug(playbook)
          const access = getPlaybookAccessStatus(slug, planTier)
          const isLocked = access !== 'full'
          const scale = ebitda ? ebitda / 1_000_000 : 1
          const impactLow = Math.round(playbook.impactBaseLow * scale)
          const impactHigh = Math.round(playbook.impactBaseHigh * scale)

          return (
            <div key={slug} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">
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
                    {reason}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {playbook.durationLow}-{playbook.durationHigh} months
                    </span>
                    <span className="flex items-center gap-1">
                      {playbook.phases.length} sections
                    </span>
                    {impactLow > 0 && (
                      <span className="flex items-center gap-1 text-green-dark">
                        <TrendingUp className="w-3 h-3" />
                        {formatCurrency(impactLow)}-{formatCurrency(impactHigh)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/playbook/${slug.toLowerCase()}/1`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-3"
              >
                {isLocked ? 'Preview Playbook' : 'Open Playbook'} →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
