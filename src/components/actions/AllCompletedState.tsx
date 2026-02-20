'use client'

import { useRouter } from 'next/navigation'
import { Trophy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

interface AllCompletedStateProps {
  completedCount: number
  valueRecovered: number
}

export function AllCompletedState({ completedCount, valueRecovered }: AllCompletedStateProps) {
  const router = useRouter()

  return (
    <div className="rounded-xl border border-green/20 bg-gradient-to-br from-green-light/50 to-teal-light/50 p-6 text-center">
      <div className="flex justify-center mb-3">
        <div className="h-12 w-12 rounded-full bg-green-light flex items-center justify-center">
          <Trophy className="h-6 w-6 text-green-dark" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        All current actions completed
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        {completedCount > 0 && valueRecovered > 0
          ? `You've completed ${completedCount} task${completedCount !== 1 ? 's' : ''} and recovered ${formatCurrency(valueRecovered)} in value. `
          : ''}
        Run a deeper assessment to unlock your next round of improvements.
      </p>
      <Button
        className="mt-4"
        onClick={() => router.push('/dashboard/diagnosis?sharpen=true')}
      >
        <Sparkles className="h-4 w-4 mr-1" />
        Re-Assess
      </Button>
    </div>
  )
}
