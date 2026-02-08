'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from '@/lib/motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { buildUrlWithRedirect } from '@/lib/utils/redirect'
import { cn } from '@/lib/utils'

interface InviteDetails {
  emailHint: string
  role: string
  organizationName: string
  companyName: string | null
  inviterName: string
  roleTemplate?: { name: string; icon: string | null }
  isExternalAdvisor: boolean
  hasExistingAccount: boolean
}

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted'
type UserState = 'checking' | 'not_logged_in' | 'logged_in_correct' | 'logged_in_wrong'

export default function InviteAcceptPage() {
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
      const { data: { user } } = await supabase.auth.getUser()

      try {
        const response = await fetch(`/api/invites/${token}/accept`)

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

        if (!user) {
          setUserState('not_logged_in')
        } else {
          setUserEmail(user.email || null)
          const userEmailHint = user.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
          if (userEmailHint === data.invite.emailHint) {
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
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.error === 'Email mismatch') {
          setUserState('logged_in_wrong')
          setError(data.message)
        } else {
          setError(data.message || data.error || 'Failed to accept invitation')
        }
        return
      }

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
    router.push(buildUrlWithRedirect('/login', `/invite/${token}`))
  }

  const handleLogin = () => {
    router.push(buildUrlWithRedirect('/login', `/invite/${token}`))
  }

  const handleSignup = () => {
    router.push(buildUrlWithRedirect('/signup', `/invite/${token}`))
  }

  const roleName = invite?.roleTemplate?.name || invite?.role.toLowerCase().replace('_', ' ')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image
            src="/logo-icon.png"
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
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          {/* Loading State */}
          {(inviteStatus === 'loading' || userState === 'checking') && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading invitation...</p>
            </div>
          )}

          {/* Invalid/Expired State */}
          {inviteStatus === 'invalid' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Invitation Not Found</h1>
                <p className="mt-2 text-muted-foreground">
                  This invitation may have expired or already been used.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Please ask the sender to create a new invitation.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Go to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Valid Invite */}
          {inviteStatus === 'valid' && invite && (
            <div className="space-y-8">
              {/* Invite Header */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Team Invitation
                </motion.div>
                <h1 className="text-3xl font-semibold text-slate-900">
                  Join {invite.companyName || invite.organizationName}
                </h1>
                <p className="text-muted-foreground">
                  {invite.inviterName} invited you to collaborate
                </p>
              </div>

              {/* Role Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Role Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your Role</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      invite.isExternalAdvisor
                        ? "bg-violet-100 text-violet-700"
                        : "bg-primary/10 text-primary"
                    )}>
                      {roleName}
                    </span>
                  </div>

                  {invite.isExternalAdvisor && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Access Type</span>
                      <span className="text-sm font-medium text-slate-700">External Advisor</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Invited to</span>
                    <span className="text-sm font-medium text-slate-700">{invite.emailHint}</span>
                  </div>
                </div>

                {/* Action Section */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  {/* Logged in with correct email */}
                  {userState === 'logged_in_correct' && (
                    <div className="space-y-3">
                      {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                          {error}
                        </div>
                      )}
                      <Button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full h-12 text-base"
                        size="lg"
                      >
                        {accepting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            Accept & Join Team
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Logged in with wrong email */}
                  {userState === 'logged_in_wrong' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Wrong account</p>
                          <p className="text-amber-700 mt-1">
                            You&apos;re signed in as <strong>{userEmail}</strong>
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleSwitchAccount} className="w-full h-12" size="lg">
                        Switch Account
                      </Button>
                    </div>
                  )}

                  {/* Not logged in */}
                  {userState === 'not_logged_in' && (
                    <div className="space-y-3">
                      <Button
                        onClick={invite.hasExistingAccount ? handleLogin : handleSignup}
                        className="w-full h-12 text-base"
                        size="lg"
                      >
                        {invite.hasExistingAccount ? 'Sign In to Accept' : 'Create Account to Accept'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        {invite.hasExistingAccount ? (
                          <>
                            Don&apos;t have an account?{' '}
                            <button onClick={handleSignup} className="text-primary hover:underline">
                              Create one
                            </button>
                          </>
                        ) : (
                          <>
                            Already have an account?{' '}
                            <button onClick={handleLogin} className="text-primary hover:underline">
                              Sign in
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* What you'll get access to */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <p className="text-sm font-medium text-slate-700 text-center">What you&apos;ll have access to:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Exit Scorecard', 'Action Plan', 'Data Room', 'Valuations'].map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {feature}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>

    </div>
  )
}
