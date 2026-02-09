'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SharpenDiagnosisBannerProps {
  companyId: string | null
  autoGenerate?: boolean
  onComplete: () => void
}

type BannerState = 'idle' | 'generating' | 'success' | 'error'

export function SharpenDiagnosisBanner({ companyId, autoGenerate, onComplete }: SharpenDiagnosisBannerProps) {
  const [state, setState] = useState<BannerState>(autoGenerate ? 'generating' : 'idle')
  const [questionCount, setQuestionCount] = useState(0)
  const hasAutoFired = useRef(false)

  const runGeneration = async () => {
    if (!companyId) return

    setState('generating')
    try {
      const res = await fetch(`/api/companies/${companyId}/dossier/generate-questions`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        if (data.questionCount > 0) {
          setQuestionCount(data.questionCount)
          setState('success')
          setTimeout(() => onComplete(), 2000)
        } else {
          setState('error')
        }
      } else {
        setState('error')
      }
    } catch {
      setState('error')
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
              {questionCount} new questions added
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review your updated categories to sharpen your scores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Couldn&apos;t generate new questions
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Something went wrong. Try again in a moment.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runGeneration}
            className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Retry
          </Button>
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
