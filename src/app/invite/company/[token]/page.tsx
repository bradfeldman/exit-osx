'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Building2,
  UserPlus,
  Crown
} from 'lucide-react'
import { buildUrlWithRedirect } from '@/lib/utils/redirect'

interface InviteDetails {
  id: string
  email: string
  inviteType: 'STAFF' | 'GUEST_OWNER'
  ownershipPercent: number | null
  company: {
    id: string
    name: string
  }
  inviter: {
    id: string
    name: string | null
    email: string
  }
  expiresAt: string
}

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted'
type UserState = 'checking' | 'not_logged_in' | 'logged_in_correct' | 'logged_in_wrong'

export default function CompanyInviteAcceptPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('loading')
  const [userState, setUserState] = useState<UserState>('checking')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInviteAndCheckAuth() {
      const supabase = createClient()

      // Check auth status
      const { data: { user } } = await supabase.auth.getUser()

      // Load invite details
      try {
        const response = await fetch(`/api/invites/company/${token}`)

        if (!response.ok) {
          const data = await response.json()
          setInviteStatus('invalid')
          setUserState('not_logged_in')
          setError(data.error || 'Invalid invitation')
          return
        }

        const data = await response.json()
        setInvite(data.invite)
        setInviteStatus('valid')

        // Determine user state based on auth and email
        if (!user) {
          setUserState('not_logged_in')
        } else {
          setUserEmail(user.email || null)
          if (user.email?.toLowerCase() === data.invite.email.toLowerCase()) {
            setUserState('logged_in_correct')
          } else {
            setUserState('logged_in_wrong')
          }
        }
      } catch {
        setInviteStatus('invalid')
        setUserState('not_logged_in')
        setError('Failed to load invitation')
      }
    }

    loadInviteAndCheckAuth()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invites/company/${token}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.error?.includes('different email')) {
          setUserState('logged_in_wrong')
        }
        setError(data.error || 'Failed to accept invitation')
        return
      }

      // Redirect to dashboard on success
      router.push('/dashboard')
    } catch {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleSwitchAccount = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(buildUrlWithRedirect('/login', `/invite/company/${token}`))
  }

  const handleLogin = () => {
    router.push(buildUrlWithRedirect('/login', `/invite/company/${token}`))
  }

  const handleSignup = () => {
    router.push(buildUrlWithRedirect('/signup', `/invite/company/${token}`))
  }

  const emailHint = invite?.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') || ''

  // Render the appropriate content based on status
  const renderContent = () => {
    // Loading state
    if (inviteStatus === 'loading' || userState === 'checking') {
      return (
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Loading invitation...</h2>
            <p className="mt-2 text-muted-foreground">Please wait while we verify your invitation</p>
          </div>
        </div>
      )
    }

    // Invalid or not found
    if (inviteStatus === 'invalid') {
      return (
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Invitation Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              {error || 'This invitation may have expired or already been used.'}
            </p>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                If you just received this link, please ask the sender to create a new invitation.
              </p>
              <p className="text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Valid invite - show based on user state
    if (inviteStatus === 'valid' && invite) {
      const roleDisplay = invite.inviteType === 'GUEST_OWNER'
        ? `Guest Owner${invite.ownershipPercent ? ` (${invite.ownershipPercent}%)` : ''}`
        : 'Staff Member'

      // Logged in with correct email
      if (userState === 'logged_in_correct') {
        return (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                {invite.inviteType === 'GUEST_OWNER' ? (
                  <Crown className="w-8 h-8 text-green-600" />
                ) : (
                  <UserPlus className="w-8 h-8 text-green-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground">You&apos;re Invited!</h2>
              <p className="mt-2 text-muted-foreground">
                Join <strong>{invite.company.name}</strong> on Exit OSx
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{invite.company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invite.inviter.name || invite.inviter.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your role</span>
                    <span className="font-medium">{roleDisplay}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full h-12"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Logged in with wrong email
      if (userState === 'logged_in_wrong') {
        return (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Wrong Account</h2>
              <p className="mt-2 text-muted-foreground">
                You&apos;re signed in with a different email
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-muted-foreground">This invite was sent to:</p>
                    <p className="font-medium mt-1">{emailHint}</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800">You&apos;re currently signed in as:</p>
                    <p className="font-medium mt-1 text-amber-900">{userEmail}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    To accept this invitation, sign in with the correct email address.
                  </p>
                  <Button onClick={handleSwitchAccount} className="w-full h-12">
                    Switch Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Not logged in
      if (userState === 'not_logged_in') {
        return (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">You&apos;re Invited!</h2>
              <p className="mt-2 text-muted-foreground">
                {invite.inviter.name || invite.inviter.email} invited you to join <strong>{invite.company.name}</strong>
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{invite.company.name}</p>
                    <p className="text-sm text-muted-foreground">Role: {roleDisplay}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in or create an account to accept this invitation
                  </p>

                  <Button onClick={handleLogin} className="w-full h-12">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Sign In to Accept
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Don&apos;t have an account? <button onClick={handleSignup} className="text-primary hover:underline">Create one</button>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  This invitation was sent to <strong>{emailHint}</strong>
                </p>
              </CardContent>
            </Card>
          </div>
        )
      }
    }

    return null
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Exit OSx"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={120}
              height={34}
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              You&apos;ve Been Invited<br />to Join a Company
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Exit OSx helps businesses prepare for successful exits with real-time valuations,
              buyer readiness scores, and actionable playbooks.
            </p>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span>Access company valuations and analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span>Collaborate with the exit team</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span>Track progress on exit preparation</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right side - Invite Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.webp"
              alt="Exit OSx"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={100}
              height={28}
              className="h-6 w-auto"
            />
          </Link>
        </div>

        {renderContent()}
      </div>
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
