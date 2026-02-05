'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EvidenceErrorProps {
  onRetry: () => void
}

export function EvidenceError({ onRetry }: EvidenceErrorProps) {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-destructive/60" />
        <h2 className="text-lg font-semibold text-foreground mt-4">Unable to load evidence</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Something went wrong loading your evidence library. Please try again.
        </p>
        <Button className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
