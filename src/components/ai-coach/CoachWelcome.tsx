'use client'

import { Sparkles } from 'lucide-react'
import { CoachSuggestedPrompts } from './CoachSuggestedPrompts'

interface CoachWelcomeProps {
  companyName?: string
  onSelectPrompt: (prompt: string) => void
}

export function CoachWelcome({ companyName, onSelectPrompt }: CoachWelcomeProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-1">Exit Coach</h2>
      <p className="text-sm text-muted-foreground mb-2 text-center max-w-md">
        AI-powered advice based on your business data
      </p>
      {companyName && (
        <p className="text-xs text-muted-foreground mb-8">
          Advising on <span className="font-medium text-foreground">{companyName}</span>
        </p>
      )}
      <CoachSuggestedPrompts onSelect={onSelectPrompt} />
    </div>
  )
}
