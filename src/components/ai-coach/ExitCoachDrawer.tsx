'use client'

import { useState, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { useExitCoach } from '@/contexts/ExitCoachContext'
import { X, Sparkles } from 'lucide-react'
import { ExitCoachMessages } from './ExitCoachMessages'
import { ExitCoachInput } from './ExitCoachInput'

const SUGGESTED_QUESTIONS = [
  "What's my biggest risk right now?",
  'How can I improve my valuation?',
  'What should I focus on this month?',
]

export function ExitCoachDrawer() {
  const { selectedCompanyId } = useCompany()
  const { isOpen, setIsOpen, messages, addMessage } = useExitCoach()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedCompanyId || isLoading) return

    const userMessage = { role: 'user' as const, content }
    addMessage(userMessage)
    setIsLoading(true)
    setError(null)

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
  }, [selectedCompanyId, isLoading, messages, addMessage])

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
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-5 w-5" />
          </button>
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
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Input */}
        <ExitCoachInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  )
}
