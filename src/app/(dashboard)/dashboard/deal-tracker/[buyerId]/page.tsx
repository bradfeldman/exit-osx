'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StageChangeModal } from '@/components/deal-tracker/StageChangeModal'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  BUYER_TYPE_LABELS,
  BUYER_TYPE_COLORS,
  BUYER_TIER_LABELS,
  BUYER_TIER_COLORS,
  CONTACT_ROLE_LABELS,
  DOCUMENT_TYPE_LABELS,
  MEETING_TYPE_LABELS,
  VALID_STAGE_TRANSITIONS,
} from '@/lib/deal-tracker/constants'
import { DealStage, BuyerType, BuyerTier, BuyerContactRole, DealDocumentType, MeetingType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface BuyerContact {
  id: string
  email: string
  firstName: string
  lastName: string
  title: string | null
  phone: string | null
  role: BuyerContactRole
  isPrimary: boolean
  isActive: boolean
  dataRoomAccess: {
    id: string
    maxStage: string
    accessLevel: string
  } | null
}

interface StageHistoryEntry {
  id: string
  fromStage: DealStage | null
  toStage: DealStage
  notes: string | null
  changedAt: string
}

interface DealActivityEntry {
  id: string
  activityType: string
  description: string
  metadata: Record<string, unknown> | null
  performedAt: string
  performedBy?: { name: string | null; email: string } | null
}

interface DealDoc {
  id: string
  documentType: DealDocumentType
  name: string
  description: string | null
  fileName: string | null
  fileSize: number | null
  receivedAt: string | null
  sentAt: string | null
  createdAt: string
}

interface DealMtg {
  id: string
  meetingType: MeetingType
  title: string
  description: string | null
  scheduledAt: string
  duration: number | null
  location: string | null
  meetingLink: string | null
  status: string
  completedAt: string | null
  notes: string | null
}

interface ProspectiveBuyer {
  id: string
  name: string
  buyerType: BuyerType
  tier: BuyerTier
  currentStage: DealStage
  website: string | null
  description: string | null
  industry: string | null
  location: string | null
  stageUpdatedAt: string
  ioiAmount: number | null
  loiAmount: number | null
  ioiDeadline: string | null
  loiDeadline: string | null
  exclusivityStart: string | null
  exclusivityEnd: string | null
  internalNotes: string | null
  approvedAt: string | null
  ndaExecutedAt: string | null
  ioiReceivedAt: string | null
  loiReceivedAt: string | null
  closedAt: string | null
  createdAt: string
  contacts: BuyerContact[]
  stageHistory: StageHistoryEntry[]
  activities: DealActivityEntry[]
  documents: DealDoc[]
  meetings: DealMtg[]
}

export default function BuyerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { selectedCompanyId } = useCompany()
  const buyerId = params.buyerId as string

  const [buyer, setBuyer] = useState<ProspectiveBuyer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showStageChange, setShowStageChange] = useState(false)
  const [targetStage, setTargetStage] = useState<DealStage | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Contact form
  const [newContact, setNewContact] = useState({
    email: '',
    firstName: '',
    lastName: '',
    title: '',
    phone: '',
    role: 'DEAL_LEAD' as BuyerContactRole,
  })

  // Document form
  const [newDocument, setNewDocument] = useState({
    documentType: 'OTHER' as DealDocumentType,
    name: '',
    description: '',
  })

  // Meeting form
  const [newMeeting, setNewMeeting] = useState({
    meetingType: 'INTRO_CALL' as MeetingType,
    title: '',
    description: '',
    scheduledAt: '',
    duration: '60',
    location: '',
    meetingLink: '',
  })

  const fetchBuyer = useCallback(async () => {
    if (!selectedCompanyId || !buyerId) return

    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-tracker/buyers/${buyerId}`
      )
      if (res.ok) {
        const data = await res.json()
        setBuyer(data.buyer)
      } else if (res.status === 404) {
        router.push('/dashboard/deal-tracker')
      }
    } catch (error) {
      console.error('Error fetching buyer:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, buyerId, router])

  useEffect(() => {
    fetchBuyer()
  }, [fetchBuyer])

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyId || !buyerId) return

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-tracker/buyers/${buyerId}/contacts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContact),
        }
      )

      if (res.ok) {
        setShowAddContact(false)
        setNewContact({ email: '', firstName: '', lastName: '', title: '', phone: '', role: 'DEAL_LEAD' })
        fetchBuyer()
        toast.success('Contact added')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add contact')
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyId || !buyerId) return

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-tracker/buyers/${buyerId}/documents`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDocument),
        }
      )

      if (res.ok) {
        setShowAddDocument(false)
        setNewDocument({ documentType: 'OTHER', name: '', description: '' })
        fetchBuyer()
        toast.success('Document added')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add document')
      }
    } catch (error) {
      console.error('Error adding document:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyId || !buyerId) return

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-tracker/buyers/${buyerId}/meetings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newMeeting,
            duration: parseInt(newMeeting.duration),
          }),
        }
      )

      if (res.ok) {
        setShowAddMeeting(false)
        setNewMeeting({
          meetingType: 'INTRO_CALL',
          title: '',
          description: '',
          scheduledAt: '',
          duration: '60',
          location: '',
          meetingLink: '',
        })
        fetchBuyer()
        toast.success('Meeting scheduled')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to schedule meeting')
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyId || !buyerId || !newNote.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-tracker/buyers/${buyerId}/activities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: newNote.trim() }),
        }
      )

      if (res.ok) {
        setShowAddNote(false)
        setNewNote('')
        fetchBuyer()
      }
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select a company.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!buyer) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Buyer not found.</p>
        <Link href="/dashboard/deal-tracker" className="text-primary hover:underline mt-2 inline-block">
          Back to Deal Tracker
        </Link>
      </div>
    )
  }

  const stageColors = STAGE_COLORS[buyer.currentStage]
  const typeColors = BUYER_TYPE_COLORS[buyer.buyerType]
  const tierColors = BUYER_TIER_COLORS[buyer.tier]
  const validTransitions = VALID_STAGE_TRANSITIONS[buyer.currentStage] || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard/deal-tracker" className="hover:text-primary">
              Deal Tracker
            </Link>
            <ChevronRightIcon className="h-4 w-4" />
            <span>{buyer.name}</span>
          </div>
          <h1 className="text-2xl font-semibold">{buyer.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={cn('text-xs px-2 py-1 rounded', typeColors.bg, typeColors.text)}>
              {BUYER_TYPE_LABELS[buyer.buyerType]}
            </span>
            <span className={cn('text-xs px-2 py-1 rounded', tierColors.bg, tierColors.text)}>
              {BUYER_TIER_LABELS[buyer.tier]}
            </span>
            <span className={cn('text-xs px-2 py-1 rounded', stageColors.bg, stageColors.text)}>
              {STAGE_LABELS[buyer.currentStage]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Change Stage
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {validTransitions.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  No available transitions
                </div>
              ) : (
                validTransitions.map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => {
                      setTargetStage(stage)
                      setShowStageChange(true)
                    }}
                  >
                    <span className={cn('w-2 h-2 rounded-full mr-2', STAGE_COLORS[stage].bg)} />
                    {STAGE_LABELS[stage]}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setShowAddNote(true)}>
            Add Note
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Stage Updated</p>
            <p className="text-lg font-semibold">{formatDate(buyer.stageUpdatedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Contacts</p>
            <p className="text-lg font-semibold">{buyer.contacts.filter(c => c.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">IOI Amount</p>
            <p className="text-lg font-semibold">
              {buyer.ioiAmount ? formatCurrency(Number(buyer.ioiAmount)) : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">LOI Amount</p>
            <p className="text-lg font-semibold">
              {buyer.loiAmount ? formatCurrency(Number(buyer.loiAmount)) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({buyer.contacts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({buyer.documents.length})</TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({buyer.meetings.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Buyer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buyer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {buyer.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a href={buyer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {buyer.website}
                    </a>
                  </div>
                )}
                {buyer.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p>{buyer.industry}</p>
                  </div>
                )}
                {buyer.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p>{buyer.location}</p>
                  </div>
                )}
                {buyer.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{buyer.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{formatDate(buyer.createdAt)}</span>
                </div>
                {buyer.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="text-sm">{formatDate(buyer.approvedAt)}</span>
                  </div>
                )}
                {buyer.ndaExecutedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">NDA Executed</span>
                    <span className="text-sm">{formatDate(buyer.ndaExecutedAt)}</span>
                  </div>
                )}
                {buyer.ioiReceivedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">IOI Received</span>
                    <span className="text-sm">{formatDate(buyer.ioiReceivedAt)}</span>
                  </div>
                )}
                {buyer.loiReceivedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">LOI Received</span>
                    <span className="text-sm">{formatDate(buyer.loiReceivedAt)}</span>
                  </div>
                )}
                {buyer.ioiDeadline && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">IOI Deadline</span>
                    <span className="text-sm text-amber-600">{formatDate(buyer.ioiDeadline)}</span>
                  </div>
                )}
                {buyer.loiDeadline && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">LOI Deadline</span>
                    <span className="text-sm text-amber-600">{formatDate(buyer.loiDeadline)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stage History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {buyer.stageHistory.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">
                        {entry.fromStage ? (
                          <>
                            <span className={cn('px-1.5 py-0.5 rounded text-xs', STAGE_COLORS[entry.fromStage].bg, STAGE_COLORS[entry.fromStage].text)}>
                              {STAGE_LABELS[entry.fromStage]}
                            </span>
                            {' '}<span className="text-muted-foreground mx-1">→</span>{' '}
                          </>
                        ) : 'Created as '}
                        <span className={cn('px-1.5 py-0.5 rounded text-xs', STAGE_COLORS[entry.toStage].bg, STAGE_COLORS[entry.toStage].text)}>
                          {STAGE_LABELS[entry.toStage]}
                        </span>
                      </p>
                      {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contacts</CardTitle>
              <Button size="sm" onClick={() => setShowAddContact(true)}>Add Contact</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {buyer.contacts.filter(c => c.isActive).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                        {contact.isPrimary && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Primary</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                      {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
                      <p className="text-xs text-muted-foreground">{CONTACT_ROLE_LABELS[contact.role]}</p>
                    </div>
                    <div className="text-right">
                      {contact.dataRoomAccess ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          VDR Access: {contact.dataRoomAccess.maxStage}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No VDR access</span>
                      )}
                    </div>
                  </div>
                ))}
                {buyer.contacts.filter(c => c.isActive).length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No contacts yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Documents</CardTitle>
              <Button size="sm" onClick={() => setShowAddDocument(true)}>Add Document</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {buyer.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">{DOCUMENT_TYPE_LABELS[doc.documentType]}</p>
                      {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
                    </div>
                    <div className="text-right">
                      {doc.receivedAt && (
                        <p className="text-xs text-muted-foreground">Received: {formatDate(doc.receivedAt)}</p>
                      )}
                      {doc.sentAt && (
                        <p className="text-xs text-muted-foreground">Sent: {formatDate(doc.sentAt)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {buyer.documents.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No documents yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Meetings</CardTitle>
              <Button size="sm" onClick={() => setShowAddMeeting(true)}>Schedule Meeting</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {buyer.meetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{meeting.title}</p>
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          meeting.status === 'completed' ? 'bg-green-100 text-green-700' :
                          meeting.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {meeting.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{MEETING_TYPE_LABELS[meeting.meetingType]}</p>
                      {meeting.location && <p className="text-xs text-muted-foreground">{meeting.location}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{formatDateTime(meeting.scheduledAt)}</p>
                      {meeting.duration && <p className="text-xs text-muted-foreground">{meeting.duration} min</p>}
                    </div>
                  </div>
                ))}
                {buyer.meetings.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No meetings scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buyer.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border-l-2 border-muted pl-4">
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(activity.performedAt)}
                        {activity.performedBy && ` by ${activity.performedBy.name || activity.performedBy.email}`}
                      </p>
                    </div>
                  </div>
                ))}
                {buyer.activities.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stage Change Modal */}
      {showStageChange && targetStage && (
        <StageChangeModal
          buyer={buyer}
          targetStage={targetStage}
          companyId={selectedCompanyId}
          isOpen={true}
          onClose={() => {
            setShowStageChange(false)
            setTargetStage(null)
          }}
          onComplete={() => {
            setShowStageChange(false)
            setTargetStage(null)
            fetchBuyer()
          }}
        />
      )}

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={newContact.title}
                onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={newContact.role}
                onValueChange={(v) => setNewContact({ ...newContact, role: v as BuyerContactRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTACT_ROLE_LABELS).map(([role, label]) => (
                    <SelectItem key={role} value={role}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddContact(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Add Contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={showAddDocument} onOpenChange={setShowAddDocument}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDocument} className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Select
                value={newDocument.documentType}
                onValueChange={(v) => setNewDocument({ ...newDocument, documentType: v as DealDocumentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newDocument.name}
                onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDocument(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Add Document</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Meeting Dialog */}
      <Dialog open={showAddMeeting} onOpenChange={setShowAddMeeting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMeeting} className="space-y-4">
            <div>
              <Label>Meeting Type</Label>
              <Select
                value={newMeeting.meetingType}
                onValueChange={(v) => setNewMeeting({ ...newMeeting, meetingType: v as MeetingType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEETING_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={newMeeting.scheduledAt}
                onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={newMeeting.duration}
                onChange={(e) => setNewMeeting({ ...newMeeting, duration: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={newMeeting.location}
                onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Meeting Link</Label>
              <Input
                type="url"
                value={newMeeting.meetingLink}
                onChange={(e) => setNewMeeting({ ...newMeeting, meetingLink: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddMeeting(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Schedule Meeting</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note to the activity timeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddNote} className="space-y-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !newNote.trim()}>Add Note</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Icons
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
