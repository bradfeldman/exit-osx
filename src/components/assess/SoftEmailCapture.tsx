'use client'

import { useState } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Check } from 'lucide-react'

interface SoftEmailCaptureProps {
  onEmailCaptured: (email: string) => void
  onSkip: () => void
  assessmentData?: {
    briScore?: number
    currentValue?: number
    potentialValue?: number
    topRisk?: string
  }
}

export function SoftEmailCapture({ onEmailCaptured, onSkip, assessmentData }: SoftEmailCaptureProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async () => {
    if (!isValidEmail) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/assess/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, assessmentData }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setSubmitted(true)
      onEmailCaptured(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl p-5 bg-card border border-border"
        style={{ borderLeft: '3px solid var(--accent, #3B82F6)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Sent! Check your inbox.</p>
            <p className="text-sm text-muted-foreground">
              We sent a summary to {email}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 bg-card border border-border"
      style={{ borderLeft: '3px solid var(--accent, #3B82F6)' }}
    >
      <h3 className="text-lg font-semibold text-foreground">
        Save your results
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        We&apos;ll email you a summary and a link to pick up where you left off.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Input
          id="soft-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="h-12 text-[15px] flex-1"
          autoComplete="email"
          aria-label="Email address"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValidEmail) handleSubmit()
          }}
        />
        <Button
          onClick={handleSubmit}
          disabled={!isValidEmail || isSubmitting}
          className="h-12 px-6 text-base font-medium sm:w-auto w-full shrink-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send My Results'
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          No spam. Unsubscribe anytime.
        </p>
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors py-2 px-1 min-h-[44px] flex items-center"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  )
}
