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
import styles from '@/components/invite/invite.module.css'

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
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.headerLogo}>
          <Image
            src="/logo-icon.png"
            alt="Exit OSx"
            width={32}
            height={32}
          />
          <Image
            src="/wordmark.svg"
            alt="Exit OSx"
            width={100}
            height={28}
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={styles.container}
        >
          {/* Loading State */}
          {(inviteStatus === 'loading' || userState === 'checking') && (
            <div className={styles.loadingState}>
              <Loader2 className={styles.loadingSpinnerIcon} style={{ animation: 'spin 1s linear infinite' }} />
              <p className={styles.loadingText}>Loading invitation...</p>
            </div>
          )}

          {/* Invalid/Expired State */}
          {inviteStatus === 'invalid' && (
            <div className={styles.invalidState}>
              <div className={styles.iconCircleRed}>
                <XCircle style={{ width: 32, height: 32, color: 'var(--red)' }} />
              </div>
              <div>
                <h1 className={styles.stateTitle}>Invitation Not Found</h1>
                <p className={styles.stateSubtitle}>
                  This invitation may have expired or already been used.
                </p>
              </div>
              <div className={styles.invalidActions}>
                <p className={styles.invalidMessage}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Invite Header */}
              <div className={styles.inviteHeader}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className={styles.badge}>
                    <Sparkles style={{ width: 16, height: 16 }} />
                    Team Invitation
                  </span>
                </motion.div>
                <h1 className={styles.inviteTitle}>
                  Join {invite.companyName || invite.organizationName}
                </h1>
                <p className={styles.inviteSubtitle}>
                  {invite.inviterName} invited you to collaborate
                </p>
              </div>

              {/* Role Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={styles.card}
              >
                <div className={styles.cardBody}>
                  {/* Role Badge */}
                  <div className={styles.roleRow}>
                    <span className={styles.roleLabel}>Your Role</span>
                    <span className={invite.isExternalAdvisor ? styles.roleBadgeExternal : styles.roleBadge}>
                      {roleName}
                    </span>
                  </div>

                  {invite.isExternalAdvisor && (
                    <div className={styles.roleRow}>
                      <span className={styles.roleLabel}>Access Type</span>
                      <span className={styles.metaValue}>External Advisor</span>
                    </div>
                  )}

                  <div className={styles.roleRow}>
                    <span className={styles.roleLabel}>Invited to</span>
                    <span className={styles.metaValue}>{invite.emailHint}</span>
                  </div>
                </div>

                {/* Action Section */}
                <div className={styles.cardFooter}>
                  {/* Logged in with correct email */}
                  {userState === 'logged_in_correct' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {error && (
                        <div className={styles.alertError}>{error}</div>
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
                            Accept &amp; Join Team
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Logged in with wrong email */}
                  {userState === 'logged_in_wrong' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className={styles.alertWarning}>
                        <AlertTriangle className={styles.alertWarningIcon} />
                        <div>
                          <p className={styles.alertWarningTitle}>Wrong account</p>
                          <p className={styles.alertWarningBody}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Button
                        onClick={invite.hasExistingAccount ? handleLogin : handleSignup}
                        className="w-full h-12 text-base"
                        size="lg"
                      >
                        {invite.hasExistingAccount ? 'Sign In to Accept' : 'Create Account to Accept'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <p className={styles.helperText}>
                        {invite.hasExistingAccount ? (
                          <>
                            Don&apos;t have an account?{' '}
                            <button onClick={handleSignup} className={styles.helperLink}>
                              Create one
                            </button>
                          </>
                        ) : (
                          <>
                            Already have an account?{' '}
                            <button onClick={handleLogin} className={styles.helperLink}>
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
                className={styles.featureSection}
              >
                <p className={styles.featureSectionLabel}>What you&apos;ll have access to:</p>
                <div className={styles.featureChips}>
                  {['Scorecard', 'Action Plan', 'Data Room', 'Valuations'].map((feature) => (
                    <span key={feature} className={styles.featureChip}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--green)' }} />
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
