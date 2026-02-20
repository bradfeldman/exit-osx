'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlaybookUpgradeGateProps {
  playbookTitle: string
}

/**
 * Inline upgrade prompt shown at section 2 of any locked playbook.
 * Not a modal — renders inline where the locked section content would be.
 */
export function PlaybookUpgradeGate({ playbookTitle }: PlaybookUpgradeGateProps) {
  return (
    <div className="max-w-lg mx-auto py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: 'var(--accent-light)' }}
      >
        <Lock className="w-7 h-7" style={{ color: 'var(--accent)' }} />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">
        You&apos;ve seen what this playbook can do
      </h2>

      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Unlock all 44 playbooks with Growth — including the rest of{' '}
        <span className="font-medium text-foreground">{playbookTitle}</span>.
        Each playbook walks you through a specific buyer readiness area with
        actionable steps and scoring.
      </p>

      <Button asChild size="lg" className="h-12 px-8 text-base font-medium">
        <Link href="/dashboard/settings?tab=billing">
          Upgrade to Growth
        </Link>
      </Button>

      <p className="text-xs text-muted-foreground mt-4">
        7-day free trial. Cancel anytime.
      </p>
    </div>
  )
}
