'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import styles from '@/components/invite/invite.module.css'

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
        <div className={styles.loadingStateAlt}>
          <div className={styles.iconCirclePrimary}>
            <Loader2 style={{ width: 32, height: 32, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
          <div>
            <h2 className={styles.stateTitle}>Loading invitation...</h2>
            <p className={styles.stateSubtitle}>Please wait while we verify your invitation</p>
          </div>
        </div>
      )
    }

    // Invalid or not found
    if (inviteStatus === 'invalid') {
      return (
        <div className={styles.loadingStateAlt}>
          <div className={styles.iconCircleRed}>
            <XCircle style={{ width: 32, height: 32, color: '#dc2626' }} />
          </div>
          <div>
            <h2 className={styles.stateTitle}>Invitation Not Found</h2>
            <p className={styles.stateSubtitle}>
              {error || 'This invitation may have expired or already been used.'}
            </p>
          </div>
          <div className={styles.companyCard}>
            <div className={styles.invalidCardBody}>
              <p className={styles.invalidHelpText}>
                If you just received this link, please ask the sender to create a new invitation.
              </p>
              <p className={styles.invalidSignInText}>
                Already have an account?{' '}
                <Link href="/login" className={styles.invalidSignInLink}>Sign in</Link>
              </p>
            </div>
          </div>
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
          <div className={styles.companyStateWrap}>
            <div className={styles.companyStateCenter}>
              <div className={styles.iconCircleGreen}>
                {invite.inviteType === 'GUEST_OWNER' ? (
                  <Crown style={{ width: 32, height: 32, color: '#16a34a' }} />
                ) : (
                  <UserPlus style={{ width: 32, height: 32, color: '#16a34a' }} />
                )}
              </div>
              <h2 className={styles.stateTitle} style={{ marginTop: 16 }}>You&apos;re Invited!</h2>
              <p className={styles.stateSubtitle}>
                Join <strong>{invite.company.name}</strong> on Exit OSx
              </p>
            </div>

            <div className={styles.companyCard}>
              <div className={styles.companyCardBody}>
                <div className={styles.companyRow}>
                  <div className={styles.companyIconWrap}>
                    <Building2 style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className={styles.companyName}>{invite.company.name}</p>
                    <p className={styles.companyInviter}>
                      Invited by {invite.inviter.name || invite.inviter.email}
                    </p>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Your role</span>
                  <span className={styles.metaValue}>{roleDisplay}</span>
                </div>

                {error && (
                  <div className={styles.alertError}>{error}</div>
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
              </div>
            </div>
          </div>
        )
      }

      // Logged in with wrong email
      if (userState === 'logged_in_wrong') {
        return (
          <div className={styles.companyStateWrap}>
            <div className={styles.companyStateCenter}>
              <div className={styles.iconCircleAmber}>
                <AlertTriangle style={{ width: 32, height: 32, color: '#d97706' }} />
              </div>
              <h2 className={styles.stateTitle} style={{ marginTop: 16 }}>Wrong Account</h2>
              <p className={styles.stateSubtitle}>
                You&apos;re signed in with a different email
              </p>
            </div>

            <div className={styles.companyCard}>
              <div className={styles.companyCardBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className={styles.infoBox}>
                    <p className={styles.infoBoxLabel}>This invite was sent to:</p>
                    <p className={styles.infoBoxValue}>{emailHint}</p>
                  </div>
                  <div className={styles.warningBox}>
                    <p className={styles.warningBoxLabel}>You&apos;re currently signed in as:</p>
                    <p className={styles.warningBoxValue}>{userEmail}</p>
                  </div>
                </div>

                <div className={styles.switchPrompt}>
                  <p className={styles.switchPromptText}>
                    To accept this invitation, sign in with the correct email address.
                  </p>
                  <Button onClick={handleSwitchAccount} className="w-full h-12">
                    Switch Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      // Not logged in
      if (userState === 'not_logged_in') {
        return (
          <div className={styles.companyStateWrap}>
            <div className={styles.companyStateCenter}>
              <div className={styles.iconCirclePrimary}>
                <Users style={{ width: 32, height: 32, color: 'var(--accent)' }} />
              </div>
              <h2 className={styles.stateTitle} style={{ marginTop: 16 }}>You&apos;re Invited!</h2>
              <p className={styles.stateSubtitle}>
                {invite.inviter.name || invite.inviter.email} invited you to join <strong>{invite.company.name}</strong>
              </p>
            </div>

            <div className={styles.companyCard}>
              <div className={styles.companyCardBody}>
                <div className={styles.companyRow}>
                  <div className={styles.companyIconWrap}>
                    <Building2 style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className={styles.companyName}>{invite.company.name}</p>
                    <p className={styles.companyInviter}>Role: {roleDisplay}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p className={styles.helperText}>
                    Sign in or create an account to accept this invitation
                  </p>

                  <Button onClick={handleLogin} className="w-full h-12">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Sign In to Accept
                  </Button>

                  <p className={styles.helperText}>
                    Don&apos;t have an account?{' '}
                    <button onClick={handleSignup} className={styles.helperLink}>Create one</button>
                  </p>
                </div>

                <p className={styles.helperText} style={{ paddingTop: 8 }}>
                  This invitation was sent to <strong>{emailHint}</strong>
                </p>
              </div>
            </div>
          </div>
        )
      }
    }

    return null
  }

  return (
    <div className={styles.splitPage}>
      {/* Left side - Branding */}
      <div className={styles.brandPanel}>
        <div className={styles.brandPanelGradient} />
        <div className={styles.brandPanelContent}>
          <Link href="/" className={styles.brandLogo}>
            <Image
              src="/logo.webp"
              alt="Exit OSx"
              width={40}
              height={40}
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={120}
              height={34}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </Link>

          <div className={styles.brandBody}>
            <h1 className={styles.brandTitle}>
              You&apos;ve Been Invited<br />to Join a Company
            </h1>
            <p className={styles.brandSubtitle}>
              Exit OSx helps businesses prepare for successful exits with real-time valuations,
              buyer readiness scores, and actionable playbooks.
            </p>
            <div className={styles.brandFeatureList}>
              <div className={styles.brandFeature}>
                <div className={styles.brandFeatureIcon}>
                  <CheckIcon style={{ width: 16, height: 16 }} />
                </div>
                <span>Access company valuations and analytics</span>
              </div>
              <div className={styles.brandFeature}>
                <div className={styles.brandFeatureIcon}>
                  <CheckIcon style={{ width: 16, height: 16 }} />
                </div>
                <span>Collaborate with the exit team</span>
              </div>
              <div className={styles.brandFeature}>
                <div className={styles.brandFeatureIcon}>
                  <CheckIcon style={{ width: 16, height: 16 }} />
                </div>
                <span>Track progress on exit preparation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Invite Content */}
      <div className={styles.contentPanel}>
        {/* Mobile logo */}
        <div className={styles.mobileLogo}>
          <Link href="/" className={styles.mobileLogoLink}>
            <Image
              src="/logo.webp"
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
        </div>

        {renderContent()}
      </div>
    </div>
  )
}

function CheckIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
