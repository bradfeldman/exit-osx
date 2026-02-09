'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SharpenDiagnosisBannerProps {
  companyId: string | null
  autoGenerate?: boolean
  onComplete: () => void
}

type BannerState = 'idle' | 'generating' | 'success'

export function SharpenDiagnosisBanner({ companyId, autoGenerate, onComplete }: SharpenDiagnosisBannerProps) {
  const [state, setState] = useState<BannerState>(autoGenerate ? 'generating' : 'idle')
  const hasAutoFired = useRef(false)

  const runGeneration = async () => {
    if (!companyId) return

    setState('generating')
    try {
      await fetch(`/api/companies/${companyId}/dossier/generate-questions`, {
        method: 'POST',
      })
      setState('success')
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch {
      // Still refresh on failure so banner doesn't get stuck
      onComplete()
    }
  }

  // Auto-generate on mount when triggered from Actions page
  useEffect(() => {
    if (autoGenerate && !hasAutoFired.current) {
      hasAutoFired.current = true
      runGeneration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate])

  if (state === 'generating') {
    return (
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Sharpening your diagnosis...
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generating follow-up questions based on your completed actions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              New questions added
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review your updated categories to sharpen your scores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          All questions answered
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Unlock follow-up questions to sharpen your scores and surface hidden risks.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={runGeneration}
        className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50"
      >
        <Sparkles className="h-4 w-4 mr-1.5" />
        Sharpen Diagnosis
      </Button>
    </div>
  )
}
