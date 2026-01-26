'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccessRequestModal } from './AccessRequestModal'
import { cn } from '@/lib/utils'

const FEATURE_NAMES: Record<string, string> = {
  'personal-financials': 'Personal Financial Statement',
  'retirement-calculator': 'Retirement Calculator',
  'business-loans': 'Business Loans',
  'pfs': 'Personal Financial Statement',
  'retirement': 'Retirement Calculator',
  'loans': 'Business Loans',
}

interface AccessRequestButtonProps {
  feature: string
  featureDisplayName?: string
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function AccessRequestButton({
  feature,
  featureDisplayName,
  variant = 'outline',
  size = 'default',
  className,
}: AccessRequestButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const displayName = featureDisplayName || FEATURE_NAMES[feature] || feature

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        className={cn('gap-2', className)}
      >
        <KeyRound className="h-4 w-4" />
        Request Access
      </Button>
      <AccessRequestModal
        open={showModal}
        onOpenChange={setShowModal}
        feature={feature}
        featureDisplayName={displayName}
      />
    </>
  )
}
