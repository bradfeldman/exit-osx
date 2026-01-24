'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BUYER_TYPE_LABELS, BUYER_TIER_LABELS, PROSPECT_STATUS_COLORS } from '@/lib/deal-tracker/constants'
import { BuyerType, BuyerTier, ProspectApprovalStatus } from '@prisma/client'

interface AddBuyerModalProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  preselectedProspect?: BuyerProspect | null
}

interface BuyerProspect {
  id: string
  name: string
  buyerType: BuyerType
  approvalStatus: ProspectApprovalStatus
  relevanceDescription: string | null
  website: string | null
  headquartersLocation: string | null
}

interface MatchResult {
  prospect: BuyerProspect
  confidence: 'exact' | 'high' | 'low'
  matchedOn: 'domain' | 'company_name'
}

interface ContactForm {
  email: string
  firstName: string
  lastName: string
  title: string
  phone: string
}

type ModalState = 'search' | 'select_prospect' | 'form' | 'no_match' | 'not_approved'

export function AddBuyerModal({
  companyId,
  isOpen,
  onClose,
  onCreated,
  preselectedProspect,
}: AddBuyerModalProps) {
  const [state, setState] = useState<ModalState>('search')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchEmail, setSearchEmail] = useState('')
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [selectedProspect, setSelectedProspect] = useState<BuyerProspect | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [buyerType, setBuyerType] = useState<BuyerType>('STRATEGIC')
  const [tier, setTier] = useState<BuyerTier>('B_TIER')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [contacts, setContacts] = useState<ContactForm[]>([
    { email: '', firstName: '', lastName: '', title: '', phone: '' },
  ])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (preselectedProspect) {
        // Pre-populate from prospect
        setSelectedProspect(preselectedProspect)
        setName(preselectedProspect.name)
        setBuyerType(preselectedProspect.buyerType)
        setWebsite(preselectedProspect.website || '')
        setLocation(preselectedProspect.headquartersLocation || '')
        setDescription(preselectedProspect.relevanceDescription || '')
        setState('form')
      } else {
        setState('search')
      }
    } else {
      resetForm()
    }
  }, [isOpen, preselectedProspect])

  const resetForm = () => {
    setState('search')
    setSearchEmail('')
    setMatches([])
    setSelectedProspect(null)
    setName('')
    setBuyerType('STRATEGIC')
    setTier('B_TIER')
    setWebsite('')
    setIndustry('')
    setLocation('')
    setDescription('')
    setContacts([{ email: '', firstName: '', lastName: '', title: '', phone: '' }])
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSearchProspect = useCallback(async () => {
    if (!searchEmail.trim() || !searchEmail.includes('@')) return

    setIsSearching(true)
    setError(null)

    try {
      const params = new URLSearchParams({ email: searchEmail.trim() })
      const res = await fetch(`/api/companies/${companyId}/prospects/match?${params}`)

      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches || [])

        if (data.matches && data.matches.length > 0) {
          setState('select_prospect')
        } else {
          setState('no_match')
        }
      }
    } catch (err) {
      console.error('Error searching prospects:', err)
      setError('Failed to search prospects')
    } finally {
      setIsSearching(false)
    }
  }, [companyId, searchEmail])

  const handleSelectProspect = (prospect: BuyerProspect) => {
    if (prospect.approvalStatus !== 'APPROVED') {
      setSelectedProspect(prospect)
      setState('not_approved')
      return
    }

    setSelectedProspect(prospect)
    setName(prospect.name)
    setBuyerType(prospect.buyerType)
    setWebsite(prospect.website || '')
    setLocation(prospect.headquartersLocation || '')
    setDescription(prospect.relevanceDescription || '')

    // Pre-fill contact email if available
    if (searchEmail && contacts[0].email === '') {
      const newContacts = [...contacts]
      newContacts[0] = { ...newContacts[0], email: searchEmail }
      setContacts(newContacts)
    }

    setState('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProspect) {
      setError('Please select an approved prospect')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const validContacts = contacts.filter(
        c => c.email.trim() && c.firstName.trim() && c.lastName.trim()
      )

      const res = await fetch(`/api/companies/${companyId}/deal-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: selectedProspect.id,
          name: name.trim() || selectedProspect.name,
          buyerType,
          tier,
          website: website.trim() || null,
          industry: industry.trim() || null,
          location: location.trim() || null,
          description: description.trim() || null,
          contacts: validContacts,
        }),
      })

      if (res.ok) {
        resetForm()
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create buyer')
      }
    } catch (err) {
      console.error('Error creating buyer:', err)
      setError('Failed to create buyer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateContact = (index: number, field: keyof ContactForm, value: string) => {
    const newContacts = [...contacts]
    newContacts[index] = { ...newContacts[index], [field]: value }
    setContacts(newContacts)
  }

  const addContact = () => {
    setContacts([...contacts, { email: '', firstName: '', lastName: '', title: '', phone: '' }])
  }

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Buyer to Pipeline</DialogTitle>
          <DialogDescription>
            {state === 'search' && 'Enter a contact email to find a matching approved prospect.'}
            {state === 'select_prospect' && 'Select a prospect to add to the deal pipeline.'}
            {state === 'form' && 'Complete the buyer details and add contacts.'}
            {state === 'no_match' && 'No matching prospect found.'}
            {state === 'not_approved' && 'This prospect is not yet approved.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Search State */}
        {state === 'search' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="searchEmail">Contact Email *</Label>
              <div className="flex gap-2">
                <Input
                  id="searchEmail"
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="contact@company.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchProspect()}
                />
                <Button onClick={handleSearchProspect} disabled={isSearching || !searchEmail.includes('@')}>
                  {isSearching ? 'Searching...' : 'Find'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll match the email domain to find approved prospects.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Select Prospect State */}
        {state === 'select_prospect' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Found {matches.length} matching prospect{matches.length === 1 ? '' : 's'}:
            </p>

            <div className="space-y-2">
              {matches.map((match) => {
                const statusColors = PROSPECT_STATUS_COLORS[match.prospect.approvalStatus]
                const isApproved = match.prospect.approvalStatus === 'APPROVED'

                return (
                  <div
                    key={match.prospect.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${isApproved ? 'hover:border-primary' : 'opacity-60'}
                    `}
                    onClick={() => handleSelectProspect(match.prospect)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{match.prospect.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {BUYER_TYPE_LABELS[match.prospect.buyerType]}
                          {match.confidence !== 'exact' && ` (${match.confidence} confidence)`}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                        {match.prospect.approvalStatus}
                      </span>
                    </div>
                    {match.prospect.relevanceDescription && (
                      <p className="mt-2 text-sm text-muted-foreground truncate">
                        {match.prospect.relevanceDescription}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setState('search')}>
                Back
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* No Match State */}
        {state === 'no_match' && (
          <div className="space-y-4 py-4 text-center">
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
              <WarningIcon className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <h3 className="font-medium text-amber-800">No Matching Prospect</h3>
              <p className="text-sm text-amber-700 mt-1">
                No approved prospect matches &quot;{searchEmail.split('@')[1]}&quot;.
              </p>
              <p className="text-sm text-amber-700 mt-2">
                Please add the company to the Prospect List first and get seller approval.
              </p>
            </div>

            <DialogFooter className="flex justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => setState('search')}>
                Try Another Email
              </Button>
              <Button type="button" onClick={handleClose}>
                Go to Prospect List
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Not Approved State */}
        {state === 'not_approved' && selectedProspect && (
          <div className="space-y-4 py-4 text-center">
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
              <WarningIcon className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <h3 className="font-medium text-amber-800">Prospect Not Approved</h3>
              <p className="text-sm text-amber-700 mt-1">
                &quot;{selectedProspect.name}&quot; is on the prospect list but has not been approved by the seller.
              </p>
              <p className="text-sm text-amber-700 mt-2">
                <strong>Status:</strong> {selectedProspect.approvalStatus}
              </p>
            </div>

            <DialogFooter className="flex justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => setState('select_prospect')}>
                Select Different Prospect
              </Button>
              <Button type="button" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Form State */}
        {state === 'form' && selectedProspect && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Linked Prospect Indicator */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800">
                Linked to approved prospect: <strong>{selectedProspect.name}</strong>
              </span>
            </div>

            {/* Buyer Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Buyer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerType">Buyer Type *</Label>
                  <Select value={buyerType} onValueChange={(v) => setBuyerType(v as BuyerType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUYER_TYPE_LABELS).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tier">Tier</Label>
                  <Select value={tier} onValueChange={(v) => setTier(v as BuyerTier)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUYER_TIER_LABELS).map(([t, label]) => (
                        <SelectItem key={t} value={t}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Technology"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="New York, NY"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the buyer..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Contacts</h3>
                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                  Add Contact
                </Button>
              </div>
              {contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Contact {index + 1} {index === 0 && '(Primary)'}
                    </span>
                    {contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={contact.firstName}
                        onChange={(e) => updateContact(index, 'firstName', e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={contact.lastName}
                        onChange={(e) => updateContact(index, 'lastName', e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(index, 'email', e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        placeholder="+1 555 123 4567"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Title</Label>
                      <Input
                        value={contact.title}
                        onChange={(e) => updateContact(index, 'title', e.target.value)}
                        placeholder="VP of Corporate Development"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Adding...' : 'Add Buyer'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Icons
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
