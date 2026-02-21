'use client'

import Link from 'next/link'
import { BookOpen, Lock } from 'lucide-react'
import { type PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'
import { getPlaybookDisplaySlug } from '@/lib/playbook/playbook-surface-mapping'
import { getPlaybookAccessStatus } from '@/lib/subscriptions/playbook-access'
import type { PlanTier } from '@/lib/pricing'

interface PlaybookLinkInPanelProps {
  playbooks: { playbook: PlaybookDefinition; reason: string }[]
  planTier: PlanTier
}

export function PlaybookLinkInPanel({ playbooks, planTier }: PlaybookLinkInPanelProps) {
  if (playbooks.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <BookOpen className="w-3 h-3" />
        Recommended Playbooks
      </p>
      {playbooks.map(({ playbook, reason }) => {
        const slug = getPlaybookDisplaySlug(playbook)
        const access = getPlaybookAccessStatus(slug, planTier)
        const isLocked = access !== 'full'

        return (
          <Link
            key={slug}
            href={isLocked ? '/dashboard/settings?tab=billing' : `/playbook/${slug.toLowerCase()}/1`}
            className="flex items-center gap-2 group py-1"
          >
            <span className="text-sm text-foreground group-hover:text-primary transition-colors font-medium line-clamp-1 flex-1">
              {playbook.title}
            </span>
            {isLocked ? (
              <Lock className="w-3 h-3 text-orange shrink-0" />
            ) : (
              <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                Open →
              </span>
            )}
          </Link>
        )
      })}
      {playbooks.length > 0 && playbooks.some(p => {
        const slug = getPlaybookDisplaySlug(p.playbook)
        return getPlaybookAccessStatus(slug, planTier) !== 'full'
      }) && (
        <p className="text-[11px] text-muted-foreground">
          <Lock className="w-2.5 h-2.5 inline mr-0.5 -mt-px" /> = Growth plan required
        </p>
      )}
    </div>
  )
}
