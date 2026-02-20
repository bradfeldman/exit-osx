'use client'

import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SessionTimeoutWarning() {
  const { showWarning, remainingSeconds, dismissWarning } = useIdleTimeout()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <Dialog open={showWarning} onOpenChange={(open) => { if (!open) dismissWarning() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-light">
              <Clock className="h-5 w-5 text-orange-dark" />
            </div>
            <div>
              <DialogTitle>Session Expiring</DialogTitle>
              <DialogDescription>
                You&apos;ll be signed out due to inactivity
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-4xl font-mono font-semibold text-orange-dark tabular-nums">
            {formatTime(remainingSeconds)}
          </p>
          <p className="text-sm text-muted-foreground">
            Click &quot;Stay Signed In&quot; or interact with the page to continue your session.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          <Button onClick={dismissWarning}>
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
