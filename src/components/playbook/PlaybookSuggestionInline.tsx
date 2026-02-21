'use client'

import Link from 'next/link'
import { BookOpen, Lock } from 'lucide-react'
import { type PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'
import { getPlaybookDisplaySlug } from '@/lib/playbook/playbook-surface-mapping'
import { getPlaybookAccessStatus } from '@/lib/subscriptions/playbook-access'
import type { PlanTier } from '@/lib/pricing'

interface PlaybookSuggestionInlineProps {
  playbook: PlaybookDefinition
  reason: string
  planTier: PlanTier
}

export function PlaybookSuggestionInline({
  playbook,
  reason,
  planTier,
}: PlaybookSuggestionInlineProps) {
  const slug = getPlaybookDisplaySlug(playbook)
  const access = getPlaybookAccessStatus(slug, planTier)
  const isLocked = access !== 'full'

  return (
    <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/50">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Related Playbook
            </p>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-light text-orange-dark dark:bg-orange-dark/30 dark:text-orange">
                <Lock className="w-2.5 h-2.5" />
                Growth
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground mt-1 line-clamp-1">
            {playbook.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reason}
          </p>
          <Link
            href={isLocked ? '/dashboard/settings?tab=billing' : `/playbook/${slug.toLowerCase()}/1`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2"
          >
            {isLocked ? 'Upgrade to Unlock' : 'Open Playbook'} →
          </Link>
        </div>
      </div>
    </div>
  )
}
