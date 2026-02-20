'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import styles from '@/components/invite/invite.module.css'

interface InviteData {
  id: string
  email: string
  isPrimary: boolean
  expiresAt: string
  hasExistingAccount: boolean
  task: {
    id: string
    title: string
    description: string
  }
  company: {
    id: string
    name: string
  }
  invitedBy: {
    name: string | null
    email: string
  }
}

export default function TaskInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites/task/${token}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to load invite')
          return
        }
        const data = await res.json()
        setInvite(data.invite)
      } catch {
        setError('Failed to load invite')
      } finally {
        setIsLoading(false)
      }
    }
    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    if (!isLoggedIn && invite) {
      // Route to the correct auth page based on account existence
      if (invite.hasExistingAccount) {
        router.push(`/login?returnUrl=/invite/task/${token}`)
      } else {
        const signupParams = new URLSearchParams({
          next: `/invite/task/${token}`,
          email: invite.email,
          team: invite.company.name,
        })
        router.push(`/signup?${signupParams.toString()}`)
      }
      return
    }

    setIsAccepting(true)
    try {
      const res = await fetch(`/api/invites/task/${token}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to accept invite')
        return
      }

      const data = await res.json()
      // Route to the Actions page with the task highlighted
      router.push(`/dashboard/action-center?company=${data.companyId}&taskId=${data.taskId}`)
    } catch {
      setError('Failed to accept invite')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = async () => {
    setIsDeclining(true)
    try {
      await fetch(`/api/invites/task/${token}`, {
        method: 'DELETE',
      })
      router.push('/')
    } catch {
      setError('Failed to decline invite')
    } finally {
      setIsDeclining(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.taskCentered}>
        <p className={styles.loadingText}>Loading invite...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.taskCentered}>
        <div className={styles.taskErrorCard}>
          <div className={styles.taskErrorInner}>
            <div className={styles.iconCircleSmall}>
              <svg style={{ width: 24, height: 24, color: '#dc2626' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className={styles.taskErrorTitle}>Unable to Load Invite</h2>
            <p className={styles.taskErrorMessage}>{error}</p>
            <Button className="mt-4" onClick={() => router.push('/')}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!invite) {
    return null
  }

  const buttonLabel = isLoggedIn
    ? 'Accept Invite'
    : invite.hasExistingAccount
      ? 'Log In to Accept'
      : 'Create Account to Accept'

  return (
    <div className={styles.taskPage}>
      <div className={styles.taskCard}>
        <div className={styles.taskCardHeader}>
          <div className={styles.iconCirclePrimary}>
            <svg style={{ width: 32, height: 32, color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className={styles.taskCardTitle}>You&apos;ve Been Invited to a Task</h1>
          <p className={styles.taskCardSubtitle}>
            <strong>{invite.invitedBy.name || invite.invitedBy.email}</strong> has invited you to work on a task for <strong>{invite.company.name}</strong>
          </p>
        </div>

        <div className={styles.taskCardBody}>
          <div className={styles.taskBox}>
            <h3 className={styles.taskBoxTitle}>{invite.task.title}</h3>
            <p className={styles.taskBoxDesc}>{invite.task.description}</p>
            {invite.isPrimary && (
              <p className={styles.taskBoxPrimary}>
                You will be the primary owner of this task
              </p>
            )}
          </div>

          <div className={styles.taskActions}>
            {!isLoggedIn && (
              <p className={styles.taskLoginHint}>
                {invite.hasExistingAccount
                  ? "You'll need to log in to accept this invite."
                  : "You'll need to create an account to accept this invite."}
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? 'Accepting...' : buttonLabel}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDecline}
              disabled={isDeclining}
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </Button>
          </div>

          <p className={styles.taskExpiry}>
            This invite expires on {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
