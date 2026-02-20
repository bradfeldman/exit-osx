'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SmartInputField } from '@/components/prospects/SmartInputField'
import { ParsedPreview } from '@/components/prospects/ParsedPreview'
import { ContactSearch } from '@/components/contacts/ContactSearch'
import { useDealParticipants } from '@/hooks/useContactSystem'
import {
  PARTICIPANT_SIDE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  ROLES_BY_SIDE,
  inferRoleFromTitle,
} from '@/lib/contact-system/constants'
import type { ParsedInput, ParsedPerson, ParsedCompany } from '@/lib/contact-system/smart-parser'
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Search,
  UserPlus,
  User,
  Building2,
} from 'lucide-react'

interface AddParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  companyId: string | null
  onCreated: () => void
}

interface BuyerOption {
  id: string
  companyName: string
}

export function AddParticipantModal({
  isOpen,
  onClose,
  dealId,
  companyId: _companyId,
  onCreated,
}: AddParticipantModalProps) {
  const [activeTab, setActiveTab] = useState<'smart' | 'search' | 'manual'>('smart')
  const [step, setStep] = useState<'input' | 'review'>('input')

  // Smart input state
  const [inputValue, setInputValue] = useState('')
  const [parsed, setParsed] = useState<ParsedInput | null>(null)

  // Search state
  const [selectedContact, setSelectedContact] = useState<{
    id: string
    firstName: string
    lastName: string
    email: string | null
    currentTitle: string | null
    currentCompany?: { id: string; name: string } | null
  } | null>(null)

  // Manual entry state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')

  // Classification
  const [side, setSide] = useState<string>('SELLER')
  const [role, setRole] = useState<string>('OTHER')
  const [dealBuyerId, setDealBuyerId] = useState<string>('')
  const [isPrimary, setIsPrimary] = useState(false)

  // Inferred role from smart parse
  const [inferredRole, setInferredRole] = useState<string | null>(null)

  // Buyers for dropdown
  const [buyers, setBuyers] = useState<BuyerOption[]>([])

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addParticipant, smartAdd: _smartAdd } = useDealParticipants(dealId)

  // Fetch buyers for the dropdown
  useEffect(() => {
    if (!dealId || !isOpen) return
    fetch(`/api/deals/${dealId}/buyers`)
      .then(r => r.json())
      .then(data => {
        if (data.buyers) {
          setBuyers(data.buyers.map((b: { id: string; canonicalCompany?: { name: string } }) => ({
            id: b.id,
            companyName: b.canonicalCompany?.name ?? 'Unknown',
          })))
        }
      })
      .catch(() => {})
  }, [dealId, isOpen])

  // Auto-set role when title is parsed
  const handleParsed = useCallback((result: ParsedInput) => {
    setParsed(result)
    setError(null)

    if (result.people.length > 0 && result.people[0].title) {
      const inferred = inferRoleFromTitle(result.people[0].title)
      if (inferred) {
        setInferredRole(inferred)
        setRole(inferred)
        // Auto-infer side from role
        if (ROLES_BY_SIDE.SELLER.includes(inferred)) setSide('SELLER')
        else if (ROLES_BY_SIDE.NEUTRAL.includes(inferred)) setSide('NEUTRAL')
        else if (ROLES_BY_SIDE.BUYER.includes(inferred)) setSide('BUYER')
      }
    }
  }, [])

  const handleContactSelect = (contact: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    currentTitle: string | null
    currentCompany?: { id: string; name: string } | null
  }) => {
    setSelectedContact(contact)
    // Auto-infer role from title
    if (contact.currentTitle) {
      const inferred = inferRoleFromTitle(contact.currentTitle)
      if (inferred) {
        setRole(inferred)
        if (ROLES_BY_SIDE.SELLER.includes(inferred)) setSide('SELLER')
        else if (ROLES_BY_SIDE.NEUTRAL.includes(inferred)) setSide('NEUTRAL')
      }
    }
  }

  const handlePersonChange = (index: number, person: ParsedPerson) => {
    if (parsed) {
      const newPeople = [...parsed.people]
      newPeople[index] = person
      setParsed({ ...parsed, people: newPeople })
    }
  }

  const handleCompanyChange = (index: number, company: ParsedCompany) => {
    if (parsed) {
      const newCompanies = [...parsed.companies]
      newCompanies[index] = company
      setParsed({ ...parsed, companies: newCompanies })
    }
  }

  // Reset on side change
  useEffect(() => {
    if (side !== 'BUYER') {
      setDealBuyerId('')
    }
    // Reset role to first valid one if current isn't valid for new side
    const validRoles = ROLES_BY_SIDE[side] ?? []
    if (!validRoles.includes(role)) {
      setRole(validRoles[0] ?? 'OTHER')
    }
  }, [side, role])

  const canProceed = () => {
    if (activeTab === 'smart') return parsed && parsed.people.length > 0
    if (activeTab === 'search') return !!selectedContact
    if (activeTab === 'manual') return firstName.trim() && lastName.trim()
    return false
  }

  const handleNext = () => {
    if (!canProceed()) {
      setError('Please provide contact information')
      return
    }
    setStep('review')
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      let canonicalPersonId: string | undefined

      if (activeTab === 'search' && selectedContact) {
        canonicalPersonId = selectedContact.id
      } else {
        // Create canonical person from smart parse or manual entry
        const personData = activeTab === 'smart' && parsed?.people[0]
          ? {
              firstName: parsed.people[0].firstName,
              lastName: parsed.people[0].lastName,
              email: parsed.people[0].email,
              phoneWork: parsed.people[0].phoneWork || parsed.people[0].phone,
              phoneCell: parsed.people[0].phoneCell,
              currentTitle: parsed.people[0].title,
              linkedInUrl: parsed.people[0].linkedInUrl,
              addressLine1: parsed.people[0].addressLine1,
              addressLine2: parsed.people[0].addressLine2,
              city: parsed.people[0].city,
              state: parsed.people[0].state,
              zip: parsed.people[0].zip,
            }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim() || undefined,
              currentTitle: title.trim() || undefined,
            }

        // Also create company if parsed
        let currentCompanyId: string | undefined
        if (activeTab === 'smart' && parsed?.companies[0]) {
          const company = parsed.companies[0]
          const companyRes = await fetch('/api/canonical/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: company.name,
              website: company.website,
              linkedInUrl: company.linkedInUrl,
            }),
          })
          if (companyRes.ok) {
            const companyData = await companyRes.json()
            currentCompanyId = companyData.company.id
          } else {
            // Handle 409 (duplicate) and 400 (domain conflict)
            try {
              const errData = await companyRes.json()
              currentCompanyId =
                errData.matchResult?.matchedEntity?.id ||
                errData.existingDomains?.[0]?.companyId
            } catch { /* ignore parse errors */ }
          }
        }

        const personRes = await fetch('/api/canonical/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...personData, currentCompanyId }),
        })

        if (!personRes.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let data: any = null
          try { data = await personRes.json() } catch { /* not JSON */ }

          // If duplicate found, use the existing person
          const existingId = data?.existingPerson?.id || data?.matchResult?.matchedEntity?.id
          if (existingId) {
            canonicalPersonId = existingId
            // Update existing person's company if we have one and they don't
            if (currentCompanyId) {
              await fetch(`/api/canonical/people/${existingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentCompanyId }),
              }).catch(() => {})
            }
          } else {
            throw new Error(data?.error || data?.message || 'Failed to create contact')
          }
        } else {
          const personResult = await personRes.json()
          canonicalPersonId = personResult.person.id
        }
      }

      if (!canonicalPersonId) throw new Error('No person to add')

      // Add as participant
      await addParticipant({
        canonicalPersonId,
        side,
        role,
        dealBuyerId: side === 'BUYER' && dealBuyerId ? dealBuyerId : null,
        isPrimary,
      })

      // Reset and close
      resetState()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetState = () => {
    setInputValue('')
    setParsed(null)
    setSelectedContact(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setTitle('')
    setSide('SELLER')
    setRole('OTHER')
    setDealBuyerId('')
    setIsPrimary(false)
    setInferredRole(null)
    setStep('input')
    setError(null)
    setActiveTab('smart')
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetState()
      onClose()
    }
  }

  const validRoles = ROLES_BY_SIDE[side] ?? []

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'input' ? (
              <>
                <UserPlus className="h-5 w-5 text-primary" />
                Add Contact
              </>
            ) : (
              <>
                <User className="h-5 w-5 text-primary" />
                Review & Classify
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'input' ? (
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'smart' | 'search' | 'manual')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="smart">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Smart Paste
                  </TabsTrigger>
                  <TabsTrigger value="search">
                    <Search className="h-4 w-4 mr-1" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    <UserPlus className="h-4 w-4 mr-1" />
                    New
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="smart" className="mt-4 space-y-4">
                  <SmartInputField
                    value={inputValue}
                    onChange={setInputValue}
                    onParsed={handleParsed}
                    placeholder="Paste a signature block, email, or contact info..."
                    minRows={5}
                  />

                  {parsed && parsed.people.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium">Detected:</p>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-sm bg-accent-light dark:bg-primary/30 text-primary dark:text-primary px-2 py-1 rounded">
                          <User className="h-3.5 w-3.5" />
                          {parsed.people[0].fullName}
                        </div>
                        {parsed.companies[0] && (
                          <div className="flex items-center gap-1.5 text-sm bg-purple-light dark:bg-purple-dark/30 text-purple-dark dark:text-purple px-2 py-1 rounded">
                            <Building2 className="h-3.5 w-3.5" />
                            {parsed.companies[0].name}
                          </div>
                        )}
                        {inferredRole && (
                          <div className="text-sm bg-green-light dark:bg-green-dark/30 text-green-dark dark:text-green px-2 py-1 rounded">
                            Role: {PARTICIPANT_ROLE_LABELS[inferredRole]}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="search" className="mt-4">
                  <ContactSearch
                    onSelect={handleContactSelect}
                    placeholder="Search existing contacts..."
                  />
                  {selectedContact && (
                    <div className="mt-3 bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedContact.currentTitle}
                        {selectedContact.currentCompany && ` at ${selectedContact.currentCompany.name}`}
                      </p>
                      {selectedContact.email && (
                        <p className="text-xs text-muted-foreground">{selectedContact.email}</p>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">First Name *</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Last Name *</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="CPA, Attorney, CFO..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Classification — always shown */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Classification
                </h4>

                {/* Side selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Side</Label>
                  <div className="flex gap-2">
                    {Object.entries(PARTICIPANT_SIDE_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSide(value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          side === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buyer dropdown (if buyer side) */}
                {side === 'BUYER' && buyers.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Linked Buyer</Label>
                    <Select value={dealBuyerId} onValueChange={setDealBuyerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select buyer company..." />
                      </SelectTrigger>
                      <SelectContent>
                        {buyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Role dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {validRoles.map(r => (
                        <SelectItem key={r} value={r}>
                          {PARTICIPANT_ROLE_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            /* Review step */
            <div className="space-y-4">
              {activeTab === 'smart' && parsed && (
                <ParsedPreview
                  parsed={parsed}
                  onPersonChange={handlePersonChange}
                  onCompanyChange={handleCompanyChange}
                  editable={true}
                />
              )}

              {activeTab === 'search' && selectedContact && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </h4>
                  {selectedContact.currentTitle && (
                    <p className="text-sm text-muted-foreground">{selectedContact.currentTitle}</p>
                  )}
                  {selectedContact.email && (
                    <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                  )}
                  {selectedContact.currentCompany && (
                    <p className="text-sm text-muted-foreground">{selectedContact.currentCompany.name}</p>
                  )}
                </div>
              )}

              {activeTab === 'manual' && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <h4 className="text-sm font-medium">{firstName} {lastName}</h4>
                  {email && <p className="text-sm text-muted-foreground">{email}</p>}
                  {title && <p className="text-sm text-muted-foreground">{title}</p>}
                </div>
              )}

              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Side</span>
                  <span className="font-medium">{PARTICIPANT_SIDE_LABELS[side as keyof typeof PARTICIPANT_SIDE_LABELS]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{PARTICIPANT_ROLE_LABELS[role]}</span>
                </div>
                {side === 'BUYER' && dealBuyerId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buyer</span>
                    <span className="font-medium">
                      {buyers.find(b => b.id === dealBuyerId)?.companyName ?? 'Selected'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-dark bg-red-light dark:bg-red-dark/30 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'input' ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next: Review
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Contact'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
