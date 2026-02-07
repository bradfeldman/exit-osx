'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Users } from 'lucide-react'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          {error ? (
            <>
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Invitation Not Found</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : accepted ? (
            <>
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">You're In</h1>
              <p className="text-sm text-muted-foreground">
                You're now the accountability partner for <strong>{invite?.companyName}</strong>.
                You'll receive monthly progress summaries via email.
              </p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Accountability Partner</h1>
              <p className="text-sm text-muted-foreground mb-6">
                <strong>{invite?.inviterName}</strong> wants you as their accountability partner
                for <strong>{invite?.companyName}</strong>.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                You'll receive monthly progress summaries (no sensitive financial data) and can
                send nudge reminders.
              </p>
              <div className="mb-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
        </CardContent>
      </Card>
    </div>
  )
}
