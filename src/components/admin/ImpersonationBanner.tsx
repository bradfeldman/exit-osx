'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'
import styles from '@/components/admin/admin.module.css'

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
    <div className={styles.adminBanner}>
      <div className={styles.adminBannerContent}>
        <AlertTriangle className={styles.adminBannerIcon} />
        <span className={styles.adminBannerText}>
          Viewing as <strong>{targetEmail}</strong>
          {remainingMinutes > 0 && (
            <span className={styles.adminBannerTimer}>
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
