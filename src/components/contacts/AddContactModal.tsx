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
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ContactSearch } from './ContactSearch'
import { BuyerContactRole } from '@prisma/client'
import { CONTACT_ROLE_LABELS } from '@/lib/contact-system/constants'
import {
  User,
  UserPlus,
  Search,
  Mail,
  Phone,
  Building2,
  Linkedin,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface AddContactModalProps {
  isOpen: boolean
  onClose: () => void
  onContactAdded: () => void
  dealId: string
  buyerId: string
  buyerName?: string
  /** Company ID to associate new contacts with */
  companyId: string
  /** IDs of contacts already added to this buyer */
  existingContactIds?: string[]
}

interface SelectedContact {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

export function AddContactModal({
  isOpen,
  onClose,
  onContactAdded,
  dealId,
  buyerId,
  buyerName,
  companyId,
  existingContactIds = [],
}: AddContactModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search')
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null)
  const [role, setRole] = useState<BuyerContactRole>(BuyerContactRole.DEAL_LEAD)
  const [isPrimary, setIsPrimary] = useState(false)

  // New contact form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [linkedInUrl, setLinkedInUrl] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('search')
      setSelectedContact(null)
      setRole(BuyerContactRole.DEAL_LEAD)
      setIsPrimary(false)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setTitle('')
      setLinkedInUrl('')
      setError(null)
    }
  }, [isOpen])

  const handleContactSelect = (contact: SelectedContact) => {
    setSelectedContact(contact)
    setError(null)
  }

  const handleCreateNew = (searchTerm: string) => {
    // Try to parse the search term as a name
    const parts = searchTerm.trim().split(/\s+/)
    if (parts.length >= 2) {
      setFirstName(parts[0])
      setLastName(parts.slice(1).join(' '))
    } else {
      setFirstName(searchTerm)
      setLastName('')
    }
    setActiveTab('create')
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      let personId: string

      if (activeTab === 'search' && selectedContact) {
        personId = selectedContact.id
      } else if (activeTab === 'create') {
        // Validate
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error('First and last name are required')
        }

        // Create new person
        const personRes = await fetch('/api/contact-system/canonical/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            currentTitle: title.trim() || null,
            linkedInUrl: linkedInUrl.trim() || null,
            currentCompanyId: companyId,
          }),
        })

        if (!personRes.ok) {
          const data = await personRes.json()
          throw new Error(data.error || 'Failed to create contact')
        }

        const personData = await personRes.json()
        personId = personData.person.id
      } else {
        throw new Error('Please select or create a contact')
      }

      // Add contact to buyer
      const contactRes = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalPersonId: personId,
          role,
          isPrimary,
        }),
      })

      if (!contactRes.ok) {
        const data = await contactRes.json()
        throw new Error(data.error || 'Failed to add contact to buyer')
      }

      onContactAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    (activeTab === 'search' && selectedContact) ||
    (activeTab === 'create' && firstName.trim() && lastName.trim())

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Contact
            {buyerName && (
              <span className="text-muted-foreground font-normal">to {buyerName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'create')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-1" />
              Find Existing
            </TabsTrigger>
            <TabsTrigger value="create">
              <UserPlus className="h-4 w-4 mr-1" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            <ContactSearch
              onSelect={handleContactSelect}
              excludeIds={existingContactIds}
              allowCreate
              onCreateNew={handleCreateNew}
            />

            {selectedContact && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </p>
                  {selectedContact.email && (
                    <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContact(null)}
                >
                  Change
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VP of Corporate Development"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn URL
              </Label>
              <Input
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                placeholder="https://linkedin.com/in/johnsmith"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Role and Primary Selection */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label>Role in this Deal</Label>
            <Select value={role} onValueChange={(v) => setRole(v as BuyerContactRole)}>
              <SelectTrigger>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
            />
            <Label htmlFor="isPrimary" className="text-sm font-normal cursor-pointer">
              Set as primary contact for this buyer
            </Label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Contact'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
