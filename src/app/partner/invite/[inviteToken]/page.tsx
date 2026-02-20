'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Users } from 'lucide-react'
import styles from '@/components/partner/partner.module.css'

interface InviteData {
  companyName: string
  inviterName: string
  alreadyAccepted: boolean
}

export default function PartnerInvitePage() {
  const params = useParams()
  const inviteToken = params.inviteToken as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/partner/invite/${inviteToken}`)
      .then(async res => {
        if (!res.ok) {
          setError('This invitation is no longer valid.')
          return
        }
        const data = await res.json()
        setInvite(data)
        if (data.alreadyAccepted) setAccepted(true)
      })
      .catch(() => setError('Failed to load invitation.'))
      .finally(() => setLoading(false))
  }, [inviteToken])

  const handleAccept = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/partner/invite/${inviteToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || null }),
      })

      if (res.ok) {
        setAccepted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to accept invitation.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.pageCentered}>
      <div className={styles.cardCentered}>
        {error ? (
          <>
            <XCircle className={`${styles.statusIcon} ${styles.statusIconError}`} size={48} />
            <h1 className={styles.cardTitle}>Invitation Not Found</h1>
            <p className={styles.cardBody}>{error}</p>
          </>
        ) : accepted ? (
          <>
            <CheckCircle className={`${styles.statusIcon} ${styles.statusIconSuccess}`} size={48} />
            <h1 className={styles.cardTitle}>You&apos;re In</h1>
            <p className={styles.cardBody}>
              You&apos;re now the accountability partner for <strong>{invite?.companyName}</strong>.
              You&apos;ll receive monthly progress summaries via email.
            </p>
          </>
        ) : (
          <>
            <div className={styles.iconAvatar}>
              <Users size={28} color="var(--accent)" />
            </div>
            <h1 className={styles.cardTitle}>Accountability Partner</h1>
            <p className={styles.cardBody}>
              <strong>{invite?.inviterName}</strong> wants you as their accountability partner
              for <strong>{invite?.companyName}</strong>.
            </p>
            <p className={styles.cardBodySmall}>
              You&apos;ll receive monthly progress summaries (no sensitive financial data) and can
              send nudge reminders.
            </p>
            <div className={styles.nameInputWrap}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className={styles.nameInput}
              />
            </div>
            <Button
              onClick={handleAccept}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
