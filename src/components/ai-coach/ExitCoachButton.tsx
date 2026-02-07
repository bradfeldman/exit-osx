'use client'

import { Sparkles } from 'lucide-react'
import { useExitCoach } from '@/contexts/ExitCoachContext'

export function ExitCoachButton() {
  const { setIsOpen } = useExitCoach()

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      title="AI Exit Coach"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  )
}
