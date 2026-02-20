'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Trash2, CheckCircle, Clock, Mail } from 'lucide-react'
import styles from './settings.module.css'

interface PartnerData {
  id: string
  email: string
  name: string | null
  acceptedAt: string | null
  isActive: boolean
  createdAt: string
  lastEmailSentAt: string | null
}

export function AccountabilityPartnerCard() {
  const { selectedCompanyId } = useCompany()
  const [partner, setPartner] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [sending, setSending] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchPartner = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/accountability-partner`)
      if (res.ok) {
        const data = await res.json()
        setPartner(data.partner)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchPartner()
  }, [fetchPartner])

  const handleInvite = async () => {
    if (!selectedCompanyId || !inviteEmail) return
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/accountability-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || null }),
      })
      if (res.ok) {
        setInviteEmail('')
        setInviteName('')
        setMessage({ type: 'success', text: 'Invitation sent!' })
        await fetchPartner()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send invitation.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setSending(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedCompanyId || !confirm('Remove your accountability partner?')) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/accountability-partner`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPartner(null)
        setMessage({ type: 'success', text: 'Partner removed.' })
      }
    } finally {
      setRemoving(false)
    }
  }

  if (loading) return null

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <Users className="h-5 w-5" />
          Accountability Partner
        </h2>
        <p className={styles.cardDescription}>
          Invite someone to receive monthly progress summaries and send you nudge reminders. No sensitive financial data is shared.
        </p>
      </div>
      <div className={styles.cardContent}>
        {partner ? (
          <div className={styles.partnerRow}>
            <div className={styles.partnerInfo}>
              <div className={styles.partnerAvatar}>
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className={styles.partnerName}>{partner.name || partner.email}</p>
                {partner.name && <p className={styles.partnerEmail}>{partner.email}</p>}
              </div>
            </div>
            <div className={styles.partnerActions}>
              {partner.acceptedAt ? (
                <span className={styles.statusAccepted}>
                  <CheckCircle className="h-3 w-3" />
                  Accepted
                </span>
              ) : (
                <span className={styles.statusPending}>
                  <Clock className="h-3 w-3" />
                  Pending
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={removing}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.fieldStack}>
            <div className={styles.formGroup}>
              <Label htmlFor="partner-email">Email address</Label>
              <Input
                id="partner-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="partner@example.com"
              />
            </div>
            <div className={styles.formGroup}>
              <Label htmlFor="partner-name">Name (optional)</Label>
              <Input
                id="partner-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Their name"
              />
            </div>
            <Button onClick={handleInvite} disabled={!inviteEmail || sending} size="sm">
              {sending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        )}

        {message && (
          <div className={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
