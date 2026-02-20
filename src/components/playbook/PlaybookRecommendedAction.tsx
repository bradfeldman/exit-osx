'use client'

import Link from 'next/link'
import { BookOpen, Lock, ArrowRight } from 'lucide-react'
import { type PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'
import { getPlaybookDisplaySlug } from '@/lib/playbook/playbook-surface-mapping'
import { getPlaybookAccessStatus } from '@/lib/subscriptions/playbook-access'
import type { PlanTier } from '@/lib/pricing'

interface PlaybookRecommendedActionProps {
  playbook: PlaybookDefinition
  reason: string
  planTier: PlanTier
}

export function PlaybookRecommendedAction({
  playbook,
  reason,
  planTier,
}: PlaybookRecommendedActionProps) {
  const slug = getPlaybookDisplaySlug(playbook)
  const access = getPlaybookAccessStatus(slug, planTier)
  const isLocked = access !== 'full'

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Recommended Playbook
        </p>
        {isLocked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Lock className="w-2.5 h-2.5" />
            Growth
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground">
        {playbook.title}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {reason}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {playbook.phases.length} sections · {playbook.durationLow}-{playbook.durationHigh} months
      </p>
      <Link
        href={`/playbook/${slug.toLowerCase()}/1`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-3"
      >
        {isLocked ? 'Preview Playbook' : 'Start Playbook'}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
