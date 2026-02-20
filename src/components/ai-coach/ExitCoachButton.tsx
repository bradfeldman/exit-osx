'use client'

import { Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ExitCoachButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/dashboard/coach')}
      className="relative rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      title="AI Exit Coach"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  )
}
