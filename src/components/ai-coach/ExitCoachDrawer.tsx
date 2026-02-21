'use client'

import { useState, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { useExitCoach } from '@/contexts/ExitCoachContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { X, Sparkles, SquarePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ExitCoachMessages } from './ExitCoachMessages'
import { ExitCoachInput } from './ExitCoachInput'
import { analytics } from '@/lib/analytics'

const SUGGESTED_QUESTIONS = [
  "What's my biggest risk right now?",
  'How can I improve my valuation?',
  'What should I focus on this month?',
]

const MAX_FREE_ATTEMPTS = 3

export function ExitCoachDrawer() {
  const { selectedCompanyId } = useCompany()
  const { isOpen, setIsOpen, messages, addMessage, clearMessages } = useExitCoach()
  const { canAccessFeature } = useSubscription()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)

  const startNewConversation = useCallback(() => {
    clearMessages()
    setError(null)
    setIsLoading(false)
    setAttemptCount(0)
  }, [clearMessages])

  const hasAICoachAccess = canAccessFeature('ai-coach')
  const showFinalUpgrade = !hasAICoachAccess && attemptCount >= MAX_FREE_ATTEMPTS

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedCompanyId || isLoading) return

    const userMessage = { role: 'user' as const, content }
    addMessage(userMessage)
    setIsLoading(true)
    setError(null)

    // Free user: show fake loading, then upgrade card
    if (!hasAICoachAccess) {
      const newAttempt = attemptCount + 1
      setAttemptCount(newAttempt)

      analytics.track('ai_coach_gated', {
        question: content.slice(0, 100),
        attemptNumber: newAttempt,
      })

      // Brief loading to build anticipation
      await new Promise(resolve => setTimeout(resolve, 1200))
      setIsLoading(false)

      addMessage({
        role: 'upgrade',
        content: '',
        upgradeAttempt: newAttempt,
      })
      return
    }

    // Paid user: normal flow
    try {
      const allMessages = [...messages, userMessage]
      const res = await fetch(`/api/companies/${selectedCompanyId}/ai-coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429) {
          setError(data.error || 'Daily message limit reached.')
        } else {
          setError('Failed to get response. Please try again.')
        }
        return
      }

      const data = await res.json()
      addMessage({ role: 'assistant', content: data.message })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, isLoading, messages, addMessage, hasAICoachAccess, attemptCount])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />

      {/* Drawer */}
      <div className="relative w-full max-w-[420px] bg-card border-l shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Exit Coach</h2>
              <p className="text-[11px] text-muted-foreground">AI-powered exit advice</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={startNewConversation}
                title="New conversation"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <SquarePen className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {messages.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium mb-1">Ask your Exit Coach</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Get specific, data-driven advice about your exit readiness
            </p>
            <div className="space-y-2 w-full">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ExitCoachMessages messages={messages} isLoading={isLoading} />
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-light border-t border-red-light">
            <p className="text-xs text-red-dark">{error}</p>
          </div>
        )}

        {/* Input or Final Upgrade CTA */}
        {showFinalUpgrade ? (
          <div className="border-t bg-card px-4 py-4">
            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4 text-center">
              <p className="text-sm font-medium mb-1">You&apos;ve explored what Exit Coach can do.</p>
              <p className="text-xs text-muted-foreground mb-3">Ready to get answers?</p>
              <Button
                className="w-full"
                onClick={() => {
                  analytics.track('ai_coach_upgrade_clicked', {
                    variant: 'final',
                    attemptNumber: attemptCount,
                    source: 'coach_drawer',
                  })
                  router.push('/dashboard/settings?tab=billing&upgrade=growth')
                }}
              >
                Upgrade to Growth
              </Button>
            </div>
          </div>
        ) : (
          <ExitCoachInput onSend={sendMessage} disabled={isLoading} />
        )}
      </div>
    </div>
  )
}
