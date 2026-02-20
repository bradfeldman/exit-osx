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
      <div className="rounded-xl border border-purple/20 bg-gradient-to-br from-purple-light/50 to-purple-light/50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-purple-light flex items-center justify-center shrink-0">
            <Loader2 className="h-4 w-4 text-purple animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Generating deeper questions...
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Creating follow-up questions based on your completed actions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-green/20 bg-gradient-to-br from-green-light/50 to-green-light/50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-light flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-green-dark" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {questionCount} new questions added
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review your updated categories to refine your scores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-orange/20 bg-gradient-to-br from-orange-light/50 to-orange-light/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-light flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-orange-dark" />
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
            className="shrink-0 border-orange/30 text-orange-dark hover:bg-orange-light"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-purple/20 bg-gradient-to-br from-purple-light/50 to-purple-light/50 p-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          All questions answered
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Unlock follow-up questions to refine your scores and surface hidden risks.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={runGeneration}
        className="shrink-0 border-purple/30 text-purple hover:bg-purple-light"
      >
        <Sparkles className="h-4 w-4 mr-1.5" />
        Re-Assess
      </Button>
    </div>
  )
}
