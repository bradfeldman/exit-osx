'use client'

import { useRouter } from 'next/navigation'
import { Lock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DealRoomTeaserProps {
  percentage: number
  canActivate: boolean
  isActivated: boolean
  documentsToUnlock: number | null
}

export function DealRoomTeaser({
  percentage,
  canActivate,
  isActivated,
  documentsToUnlock,
}: DealRoomTeaserProps) {
  const router = useRouter()

  if (isActivated) return null

  const isReady = percentage >= 70

  return (
    <div
      className={cn(
        'rounded-xl border p-6',
        isReady
          ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10'
          : 'border-dashed border-border/50'
      )}
    >
      {isReady ? (
        <>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">
              DEAL ROOM READY
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Your evidence is {percentage}% buyer-ready. You&apos;ve earned access to your Deal Room.
          </p>
          {canActivate && (
            <Button
              className="mt-4"
              onClick={() => router.push('/dashboard/deal-room')}
            >
              Activate Deal Room
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              DEAL ROOM
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Almost Ready
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Your evidence is {percentage}% buyer-ready.
            {documentsToUnlock && ` Upload ${documentsToUnlock} more document${documentsToUnlock > 1 ? 's' : ''} to unlock your Deal Room`}
            {' '}&mdash; where you&apos;ll manage buyer access, track who&apos;s viewing what, and run your sale process.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              'Buyer access control with NDA tracking',
              'Document watermarking and download analytics',
              'Buyer Q&A with threaded responses',
              'Stage-gated disclosure (Teaser → Post-NDA → Full DD)',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
