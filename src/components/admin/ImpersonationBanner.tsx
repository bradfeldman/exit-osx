'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'

interface ImpersonationBannerProps {
  targetEmail: string
  remainingMinutes: number
}

export function ImpersonationBanner({ targetEmail, remainingMinutes }: ImpersonationBannerProps) {
  const router = useRouter()
  const [isEnding, setIsEnding] = useState(false)

  const handleEndImpersonation = async () => {
    setIsEnding(true)
    try {
      const response = await fetch('/api/admin/impersonate/end', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/admin')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to end impersonation:', error)
    } finally {
      setIsEnding(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-yellow-500 px-6 py-2 text-yellow-950">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Viewing as <strong>{targetEmail}</strong>
          {remainingMinutes > 0 && (
            <span className="ml-2 text-yellow-800">
              ({remainingMinutes} min remaining)
            </span>
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEndImpersonation}
        disabled={isEnding}
        className="h-7 gap-1 bg-yellow-600/20 text-yellow-950 hover:bg-yellow-600/40"
      >
        <X className="h-3 w-3" />
        Exit
      </Button>
    </div>
  )
}
