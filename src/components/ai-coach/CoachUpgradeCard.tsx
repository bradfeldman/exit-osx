'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics'

interface CoachUpgradeCardProps {
  variant: 'detailed' | 'compact' | 'final'
  attemptNumber: number
}

export function CoachUpgradeCard({ variant, attemptNumber }: CoachUpgradeCardProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    analytics.track('ai_coach_upgrade_clicked', {
      variant,
      attemptNumber,
      source: 'coach_drawer',
    })
    router.push('/dashboard/settings?tab=billing&upgrade=growth')
  }

  if (variant === 'final') {
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 animate-in fade-in-0 duration-300">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">You&apos;ve explored what Exit Coach can do.</p>
            <p className="text-sm text-muted-foreground">Ready to get answers?</p>
          </div>
        </div>
        <Button onClick={handleUpgrade} className="w-full">
          Upgrade to Growth
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">Starting at $149/mo</p>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 animate-in fade-in-0 duration-300">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-sm font-medium">Exit Coach is a Growth plan feature.</p>
        </div>
        <Button onClick={handleUpgrade} className="w-full">
          Upgrade to Growth
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">Starting at $149/mo</p>
      </div>
    )
  }

  // Detailed variant (first attempt)
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 animate-in fade-in-0 duration-300">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-2">Exit Coach can answer this.</p>
          <p className="text-sm text-muted-foreground mb-3">
            Your question is exactly the kind of strategic insight Exit Coach provides — personalized to your business data and exit timeline.
          </p>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-muted-foreground">Advice based on YOUR financials</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-muted-foreground">Risk-specific recommendations</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-muted-foreground">Action priorities for this month</span>
            </div>
          </div>
        </div>
      </div>
      <Button onClick={handleUpgrade} className="w-full">
        Upgrade to Growth
      </Button>
      <p className="text-xs text-muted-foreground text-center mt-2">Starting at $149/mo</p>
    </div>
  )
}
