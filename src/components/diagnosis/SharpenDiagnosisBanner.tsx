'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SharpenDiagnosisBannerProps {
  companyId: string | null
  onComplete: () => void
}

export function SharpenDiagnosisBanner({ companyId, onComplete }: SharpenDiagnosisBannerProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!companyId || isGenerating) return

    setIsGenerating(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/dossier/generate-questions`, {
        method: 'POST',
      })
      if (res.ok) {
        onComplete()
      }
    } catch {
      // Silently fail
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          All questions answered
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate deeper AI-powered questions to improve your diagnosis accuracy.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Sharpen Diagnosis
          </>
        )}
      </Button>
    </div>
  )
}
