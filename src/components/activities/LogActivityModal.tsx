'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActivityType } from '@prisma/client'
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from '@/lib/contact-system/constants'
import {
  Mail,
  MailOpen,
  PhoneOutgoing,
  PhoneIncoming,
  Calendar,
  CalendarCheck,
  CalendarX,
  FileText,
  ArrowRight,
  FileUp,
  FileDown,
  Key,
  KeyRound,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
} from 'lucide-react'

interface LogActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onActivityLogged: () => void
  dealId: string
  buyerId: string
  buyerName?: string
  contacts?: {
    id: string
    personId: string
    person: {
      firstName: string
      lastName: string
      email: string | null
    }
  }[]
}

// Icon components mapping
const ICON_COMPONENTS: Record<string, React.ReactNode> = {
  'mail': <Mail className="h-4 w-4" />,
  'mail-open': <MailOpen className="h-4 w-4" />,
  'phone-outgoing': <PhoneOutgoing className="h-4 w-4" />,
  'phone-incoming': <PhoneIncoming className="h-4 w-4" />,
  'calendar': <Calendar className="h-4 w-4" />,
  'calendar-check': <CalendarCheck className="h-4 w-4" />,
  'calendar-x': <CalendarX className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  'arrow-right': <ArrowRight className="h-4 w-4" />,
  'file-up': <FileUp className="h-4 w-4" />,
  'file-down': <FileDown className="h-4 w-4" />,
  'key': <Key className="h-4 w-4" />,
  'key-off': <KeyRound className="h-4 w-4" />,
  'clock': <Clock className="h-4 w-4" />,
  'check-circle': <CheckCircle className="h-4 w-4" />,
  'x-circle': <XCircle className="h-4 w-4" />,
}

// Activity types that users can log manually
const LOGGABLE_ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.EMAIL_SENT,
  ActivityType.EMAIL_RECEIVED,
  ActivityType.CALL_OUTBOUND,
  ActivityType.CALL_INBOUND,
  ActivityType.MEETING_SCHEDULED,
  ActivityType.MEETING_COMPLETED,
  ActivityType.MEETING_CANCELLED,
  ActivityType.NOTE_ADDED,
  ActivityType.DOCUMENT_SENT,
  ActivityType.DOCUMENT_RECEIVED,
]

export function LogActivityModal({
  isOpen,
  onClose,
  onActivityLogged,
  dealId,
  buyerId,
  buyerName,
  contacts = [],
}: LogActivityModalProps) {
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.NOTE_ADDED)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActivityType(ActivityType.NOTE_ADDED)
      setSubject('')
      setDescription('')
      setSelectedContactId('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType,
          subject: subject.trim(),
          description: description.trim() || null,
          metadata: selectedContactId
            ? { contactId: selectedContactId }
            : {},
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to log activity')
      }

      onActivityLogged()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPlaceholderText = () => {
    switch (activityType) {
      case ActivityType.EMAIL_SENT:
        return 'e.g., Sent initial outreach email'
      case ActivityType.EMAIL_RECEIVED:
        return 'e.g., Received response expressing interest'
      case ActivityType.CALL_OUTBOUND:
        return 'e.g., Called to discuss opportunity'
      case ActivityType.CALL_INBOUND:
        return 'e.g., Received callback from CFO'
      case ActivityType.MEETING_SCHEDULED:
        return 'e.g., Scheduled management presentation for 3/15'
      case ActivityType.MEETING_COMPLETED:
        return 'e.g., Completed initial meeting'
      case ActivityType.MEETING_CANCELLED:
        return 'e.g., Meeting cancelled - will reschedule'
      case ActivityType.NOTE_ADDED:
        return 'e.g., Internal note about buyer strategy'
      case ActivityType.DOCUMENT_SENT:
        return 'e.g., Sent teaser document'
      case ActivityType.DOCUMENT_RECEIVED:
        return 'e.g., Received signed NDA'
      default:
        return 'Enter a subject...'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log Activity
            {buyerName && (
              <span className="text-muted-foreground font-normal">- {buyerName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select
              value={activityType}
              onValueChange={(v) => setActivityType(v as ActivityType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOGGABLE_ACTIVITY_TYPES.map((type) => {
                  const iconName = ACTIVITY_TYPE_ICONS[type]
                  const icon = ICON_COMPONENTS[iconName]

                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {icon}
                        {ACTIVITY_TYPE_LABELS[type]}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={getPlaceholderText()}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
            />
          </div>

          {/* Contact Selection */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Related Contact (optional)</Label>
              <Select
                value={selectedContactId}
                onValueChange={setSelectedContactId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific contact</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.personId}>
                      {contact.person.firstName} {contact.person.lastName}
                      {contact.person.email && (
                        <span className="text-muted-foreground ml-2">
                          ({contact.person.email})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !subject.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              'Log Activity'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
