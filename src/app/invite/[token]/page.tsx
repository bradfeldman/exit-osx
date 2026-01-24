'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InviteDetails {
  email: string
  role: string
  organizationName: string
  inviterName: string
  expiresAt: string
  isExpired: boolean
  isAccepted: boolean
}

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function checkAuthAndLoadInvite() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      try {
        const response = await fetch(`/api/invites/${token}/accept`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to load invite')
          return
        }

        setInvite(data.invite)
      } catch {
        setError('Failed to load invite details')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || data.error || 'Failed to accept invite')
        return
      }

      // Redirect to dashboard on success
      router.push('/dashboard')
    } catch {
      setError('Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  const handleLogin = () => {
    // Redirect to login with return URL
    router.push(`/login?redirect=/invite/${token}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invite?.isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite Already Accepted</CardTitle>
            <CardDescription>
              This invite has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invite?.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invite Expired</CardTitle>
            <CardDescription>
              This invite has expired. Please ask for a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {invite?.organizationName}</CardTitle>
          <CardDescription>
            {invite?.inviterName} has invited you to join their organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{invite?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{invite?.role.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {isLoggedIn ? (
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? 'Accepting...' : 'Accept Invite'}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Please log in to accept this invite
              </p>
              <Button onClick={handleLogin} className="w-full">
                Log In
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/signup?redirect=/invite/${token}`)}
                className="w-full"
              >
                Create Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
