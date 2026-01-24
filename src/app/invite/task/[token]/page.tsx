'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface InviteData {
  id: string
  email: string
  isPrimary: boolean
  expiresAt: string
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
    if (!isLoggedIn) {
      // Redirect to login with return URL
      router.push(`/login?returnUrl=/invite/task/${token}`)
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
      // Redirect to the task/dashboard
      router.push(`/dashboard?company=${data.companyId}`)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-muted-foreground">Loading invite...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Invite</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button className="mt-4" onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <CardTitle className="text-xl">You&apos;ve Been Invited to a Task</CardTitle>
          <p className="text-muted-foreground mt-2">
            <strong>{invite.invitedBy.name || invite.invitedBy.email}</strong> has invited you to work on a task for <strong>{invite.company.name}</strong>
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{invite.task.title}</h3>
            <p className="text-sm text-muted-foreground">{invite.task.description}</p>
            {invite.isPrimary && (
              <p className="text-sm text-primary mt-2 font-medium">
                You will be the primary owner of this task
              </p>
            )}
          </div>

          <div className="space-y-3">
            {!isLoggedIn && (
              <p className="text-sm text-center text-muted-foreground mb-4">
                You&apos;ll need to log in or create an account to accept this invite.
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? 'Accepting...' : isLoggedIn ? 'Accept Invite' : 'Log In to Accept'}
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

          <p className="text-xs text-center text-muted-foreground mt-4">
            This invite expires on {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
