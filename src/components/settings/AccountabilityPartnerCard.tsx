'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Trash2, CheckCircle, Clock, Mail } from 'lucide-react'

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Accountability Partner
        </CardTitle>
        <CardDescription>
          Invite someone to receive monthly progress summaries and send you nudge reminders. No sensitive financial data is shared.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {partner ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{partner.name || partner.email}</p>
                  {partner.name && <p className="text-xs text-muted-foreground">{partner.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {partner.acceptedAt ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="h-3 w-3" />
                    Accepted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removing}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="partner-email">Email address</Label>
              <Input
                id="partner-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="partner@example.com"
              />
            </div>
            <div className="space-y-2">
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
          <div
            className={`mt-3 p-2 rounded text-xs ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
