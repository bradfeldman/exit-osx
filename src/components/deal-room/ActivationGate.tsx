'use client'

import { Lock, Check, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ActivationGateProps {
  activation: {
    evidenceReady: boolean
    evidenceScore: number
    tenureReady: boolean
    accountAgeDays: number
    tierReady: boolean
    currentTier: string
    canActivate: boolean
  }
  onActivate: () => void
  isActivating: boolean
}

export function ActivationGate({ activation, onActivate, isActivating }: ActivationGateProps) {
  const tierLabel =
    activation.currentTier === 'EXIT_READY' ? 'Exit-Ready'
      : activation.currentTier === 'GROWTH' ? 'Growth'
      : 'Foundation'

  const daysUntilTenure = Math.max(0, 90 - activation.accountAgeDays)

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
      <Lock className="w-12 h-12 text-muted-foreground/40" />

      <h1 className="text-xl font-semibold text-foreground mt-4">Deal Room</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Your Deal Room activates when you&apos;re ready to run a sale process. Here&apos;s where you stand:
      </p>

      <div className="mt-8 space-y-3 text-left w-full">
        {/* Evidence requirement */}
        <div className="flex items-center gap-3">
          {activation.evidenceReady ? (
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={activation.evidenceReady ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
            Evidence: {activation.evidenceScore}% buyer-ready
            {!activation.evidenceReady && ' (70% required)'}
          </span>
        </div>

        {/* Tenure requirement */}
        <div className="flex items-center gap-3">
          {activation.tenureReady ? (
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={activation.tenureReady ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
            Platform tenure: {activation.accountAgeDays} days
            {!activation.tenureReady && ' (90 required)'}
          </span>
        </div>

        {/* Tier requirement */}
        <div className="flex items-center gap-3">
          {activation.tierReady ? (
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={activation.tierReady ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
            Subscription: {tierLabel}
            {!activation.tierReady && ' (Exit-Ready required)'}
          </span>
        </div>
      </div>

      <div className="mt-8">
        {activation.canActivate ? (
          <Button
            onClick={onActivate}
            disabled={isActivating}
            className="bg-[var(--burnt-orange)] hover:bg-[var(--burnt-orange)]/90 text-white"
          >
            {isActivating ? 'Activating...' : 'Activate Deal Room'}
          </Button>
        ) : !activation.tierReady ? (
          <Button asChild className="bg-[var(--burnt-orange)] hover:bg-[var(--burnt-orange)]/90 text-white">
            <Link href="/settings/billing">Upgrade to Exit-Ready</Link>
          </Button>
        ) : !activation.evidenceReady ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/evidence">Build Your Evidence</Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Available in {daysUntilTenure} days
          </p>
        )}
      </div>
    </div>
  )
}
