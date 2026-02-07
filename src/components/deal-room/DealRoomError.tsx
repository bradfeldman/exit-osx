'use client'

import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DealRoomErrorProps {
  onRetry: () => void
}

export function DealRoomError({ onRetry }: DealRoomErrorProps) {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <Card className="p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-sm font-medium mt-3">Unable to load your Deal Room</p>
        <p className="text-xs text-muted-foreground mt-1">
          Please refresh the page or try again in a moment.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try Again
        </Button>
      </Card>
    </div>
  )
}
