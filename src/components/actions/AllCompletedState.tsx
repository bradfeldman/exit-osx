'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AllCompletedStateProps {
  completedCount: number
  valueRecovered: number
  companyId: string | null
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

export function AllCompletedState({ completedCount, valueRecovered, companyId }: AllCompletedStateProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSharpenDiagnosis = async () => {
    if (!companyId) {
      router.push('/dashboard/diagnosis')
      return
    }

    setIsGenerating(true)
    try {
      await fetch(`/api/companies/${companyId}/dossier/generate-questions`, {
        method: 'POST',
      })
    } catch {
      // Continue to diagnosis even if generation fails
    }
    router.push('/dashboard/diagnosis')
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 p-6 text-center">
      <div className="flex justify-center mb-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <Trophy className="h-6 w-6 text-emerald-600" />
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
        onClick={handleSharpenDiagnosis}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Generating deeper questions...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-1" />
            Sharpen Diagnosis
          </>
        )}
      </Button>
    </div>
  )
}
