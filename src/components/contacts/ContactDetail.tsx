'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BuyerContactRole, DataQuality } from '@prisma/client'
import {
  CONTACT_ROLE_LABELS,
  DATA_QUALITY_LABELS,
  DATA_QUALITY_COLORS,
} from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import {
  User,
  Mail,
  Phone,
  Linkedin,
  Star,
  StarOff,
  Trash2,
  ExternalLink,
  History,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface DealContactDetail {
  id: string
  role: BuyerContactRole
  isPrimary: boolean
  canonicalPerson: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    linkedInUrl: string | null
    currentTitle: string | null
    dataQuality: DataQuality
    currentCompany?: {
      id: string
      name: string
    } | null
  }
  dataRoomAccess?: {
    id: string
    stage: string
    lastAccessAt: string | null
  } | null
  createdAt: string
}

interface ContactDetailProps {
  dealId: string
  buyerId: string
  contactId: string
  onUpdate?: () => void
  onRemove?: () => void
  className?: string
}

export function ContactDetail({
  dealId,
  buyerId,
  contactId,
  onUpdate,
  onRemove,
  className,
}: ContactDetailProps) {
  const [contact, setContact] = useState<DealContactDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const fetchContact = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/deals/${dealId}/buyers/${buyerId}/contacts/${contactId}`
      )
      if (res.ok) {
        const data = await res.json()
        setContact(data.contact)
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContact()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, buyerId, contactId])

  const handleRoleChange = async (newRole: BuyerContactRole) => {
    if (!contact || isUpdating) return

    setIsUpdating(true)
    try {
      const res = await fetch(
        `/api/deals/${dealId}/buyers/${buyerId}/contacts/${contactId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      )
      if (res.ok) {
        setContact({ ...contact, role: newRole })
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error updating contact role:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTogglePrimary = async () => {
    if (!contact || isUpdating) return

    setIsUpdating(true)
    try {
      const res = await fetch(
        `/api/deals/${dealId}/buyers/${buyerId}/contacts/${contactId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPrimary: !contact.isPrimary }),
        }
      )
      if (res.ok) {
        setContact({ ...contact, isPrimary: !contact.isPrimary })
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error updating primary status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    if (!contact || isRemoving) return
    if (!confirm('Remove this contact from the buyer?')) return

    setIsRemoving(true)
    try {
      const res = await fetch(
        `/api/deals/${dealId}/buyers/${buyerId}/contacts/${contactId}`,
        {
          method: 'DELETE',
        }
      )
      if (res.ok) {
        onRemove?.()
      }
    } catch (error) {
      console.error('Error removing contact:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    )
  }

  if (!contact) {
    return null
  }

  const person = contact.canonicalPerson
  const qualityColor = DATA_QUALITY_COLORS[person.dataQuality] || 'gray'

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            {contact.isPrimary && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                <Star className="h-3 w-3 text-yellow-900" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {person.firstName} {person.lastName}
                </h3>
                {person.currentTitle && (
                  <p className="text-sm text-muted-foreground">
                    {person.currentTitle}
                    {person.currentCompany && (
                      <span className="text-muted-foreground/70">
                        {' '}at {person.currentCompany.name}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  `border-${qualityColor}-300 text-${qualityColor}-700`
                )}
              >
                {DATA_QUALITY_LABELS[person.dataQuality]}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="mt-4 space-y-2">
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                  {person.email}
                </a>
              )}
              {person.phone && (
                <a
                  href={`tel:${person.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                  {person.phone}
                </a>
              )}
              {person.linkedInUrl && (
                <a
                  href={person.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Role Selection */}
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Deal Role:</span>
                <Select
                  value={contact.role}
                  onValueChange={(v) => handleRoleChange(v as BuyerContactRole)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* VDR Access Info */}
              {contact.dataRoomAccess && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>VDR Access:</span>
                  <Badge variant="secondary">{contact.dataRoomAccess.stage}</Badge>
                  {contact.dataRoomAccess.lastAccessAt && (
                    <span>
                      Last accessed:{' '}
                      {new Date(contact.dataRoomAccess.lastAccessAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePrimary}
                  disabled={isUpdating}
                >
                  {contact.isPrimary ? (
                    <>
                      <StarOff className="h-4 w-4 mr-1" />
                      Remove Primary
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-1" />
                      Set Primary
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/dashboard/contacts/${person.id}`}>
                    <History className="h-4 w-4 mr-1" />
                    View History
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
