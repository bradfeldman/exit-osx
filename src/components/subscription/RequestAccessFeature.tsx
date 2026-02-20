'use client'

import { useState } from 'react'
import { KeyRound, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AccessRequestModal } from '@/components/access/AccessRequestModal'

const FEATURE_NAMES: Record<string, string> = {
  'personal-financials': 'Personal Financial Statement',
  'retirement-calculator': 'Retirement Calculator',
  'business-loans': 'Business Loans',
}

interface RequestAccessFeatureProps {
  feature: string
  featureDisplayName?: string
  className?: string
  variant?: 'card' | 'inline' | 'minimal'
}

export function RequestAccessFeature({
  feature,
  featureDisplayName,
  className,
  variant = 'card',
}: RequestAccessFeatureProps) {
  const [showRequestModal, setShowRequestModal] = useState(false)

  const displayName = featureDisplayName || FEATURE_NAMES[feature] || 'Feature'

  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={() => setShowRequestModal(true)}
          className={cn(
            'flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors',
            className
          )}
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span className="text-sm">Request Access</span>
        </button>
        <AccessRequestModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          feature={feature}
          featureDisplayName={displayName}
        />
      </>
    )
  }

  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={() => setShowRequestModal(true)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-dashed border-orange/30 bg-orange/5 px-3 py-1.5 text-sm text-muted-foreground hover:border-orange/50 hover:bg-orange/10 hover:text-foreground transition-colors',
            className
          )}
        >
          <KeyRound className="h-3.5 w-3.5 text-orange" />
          <span>{displayName}</span>
          <span className="text-xs">(Request access)</span>
        </button>
        <AccessRequestModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          feature={feature}
          featureDisplayName={displayName}
        />
      </>
    )
  }

  // Card variant (default)
  return (
    <>
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-orange/30 bg-orange/5 p-8 text-center',
          className
        )}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange/10">
          <KeyRound className="h-6 w-6 text-orange-dark" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {displayName}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          This is a personal feature. Request access from your company owner.
        </p>
        <Button
          variant="outline"
          className="border-orange/50 hover:bg-orange/10"
          onClick={() => setShowRequestModal(true)}
        >
          Request Access
          <Send className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <AccessRequestModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        feature={feature}
        featureDisplayName={displayName}
      />
    </>
  )
}
