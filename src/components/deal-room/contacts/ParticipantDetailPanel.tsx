'use client'

import { useState } from 'react'
import { X, Mail, Phone, Linkedin, ExternalLink, Pencil, Check, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CategoryBadge } from './CategoryBadge'
import { useDealParticipants } from '@/hooks/useContactSystem'
import {
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
} from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import type { DealParticipantData } from '@/hooks/useContactSystem'

interface ParticipantDetailPanelProps {
  participant: DealParticipantData
  dealId: string
  onClose: () => void
  onUpdate: () => void
}

export function ParticipantDetailPanel({
  participant,
  dealId,
  onClose,
  onUpdate,
}: ParticipantDetailPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [editDescription, setEditDescription] = useState(participant.description ?? '')
  const [editNotes, setEditNotes] = useState(participant.notes ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [editFields, setEditFields] = useState({
    firstName: participant.canonicalPerson.firstName,
    lastName: participant.canonicalPerson.lastName,
    email: participant.canonicalPerson.email ?? '',
    phoneWork: participant.canonicalPerson.phoneWork ?? participant.canonicalPerson.phone ?? '',
    phoneCell: participant.canonicalPerson.phoneCell ?? '',
    currentTitle: participant.canonicalPerson.currentTitle ?? '',
    companyName: participant.canonicalPerson.currentCompany?.name ?? '',
    linkedInUrl: participant.canonicalPerson.linkedInUrl ?? '',
    addressLine1: participant.canonicalPerson.addressLine1 ?? '',
    addressLine2: participant.canonicalPerson.addressLine2 ?? '',
    city: participant.canonicalPerson.city ?? '',
    state: participant.canonicalPerson.state ?? '',
    zip: participant.canonicalPerson.zip ?? '',
  })
  const { updateParticipant, removeParticipant } = useDealParticipants(dealId)

  const { canonicalPerson, isPrimary, isActive, dealBuyer, createdAt } = participant
  const category = participant.category ?? 'OTHER'
  const displayName = isEditing
    ? `${editFields.firstName} ${editFields.lastName}`
    : `${canonicalPerson.firstName} ${canonicalPerson.lastName}`
  const initials = `${canonicalPerson.firstName.charAt(0)}${canonicalPerson.lastName.charAt(0)}`.toUpperCase()

  const handleCategoryChange = async (newCategory: string) => {
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { category: newCategory })
      // Optimistic update in hook handles UI - no refresh needed
    } catch {
      // silently fail - optimistic update already rolled back
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDescriptionBlur = async () => {
    if (editDescription === (participant.description ?? '')) return
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { description: editDescription })
      // Optimistic update in hook handles UI - no refresh needed
    } catch {
      // silently fail - optimistic update already rolled back
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNotesBlur = async () => {
    if (editNotes === (participant.notes ?? '')) return
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { notes: editNotes })
      // Optimistic update in hook handles UI - no refresh needed
    } catch {
      // silently fail - optimistic update already rolled back
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTogglePrimary = async () => {
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { isPrimary: !isPrimary })
      // Optimistic update in hook handles UI - no refresh needed
    } catch {
      // silently fail - optimistic update already rolled back
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    setIsUpdating(true)
    try {
      await removeParticipant(participant.id)
      // Refresh triggers in hook after successful deletion
      onUpdate()
      onClose()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveContactInfo = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/canonical/people/${canonicalPerson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFields.firstName.trim(),
          lastName: editFields.lastName.trim(),
          email: editFields.email.trim() || null,
          phoneWork: editFields.phoneWork.trim() || null,
          phoneCell: editFields.phoneCell.trim() || null,
          currentTitle: editFields.currentTitle.trim() || null,
          companyName: editFields.companyName.trim() || null,
          linkedInUrl: editFields.linkedInUrl.trim() || null,
          addressLine1: editFields.addressLine1.trim() || null,
          addressLine2: editFields.addressLine2.trim() || null,
          city: editFields.city.trim() || null,
          state: editFields.state.trim() || null,
          zip: editFields.zip.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      setIsEditing(false)
      // Trigger refresh for canonical person updates (not optimistically handled)
      onUpdate()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-card border-l border-border shadow-xl z-50 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground pr-8">{displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <CategoryBadge category={category} />
                {participant.description && (
                  <span className="text-xs text-muted-foreground">
                    {participant.description}
                  </span>
                )}
                {isPrimary && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Primary
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Contact Info */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Contact Info
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditFields({
                        firstName: canonicalPerson.firstName,
                        lastName: canonicalPerson.lastName,
                        email: canonicalPerson.email ?? '',
                        phoneWork: canonicalPerson.phoneWork ?? canonicalPerson.phone ?? '',
                        phoneCell: canonicalPerson.phoneCell ?? '',
                        currentTitle: canonicalPerson.currentTitle ?? '',
                        companyName: canonicalPerson.currentCompany?.name ?? '',
                        linkedInUrl: canonicalPerson.linkedInUrl ?? '',
                        addressLine1: canonicalPerson.addressLine1 ?? '',
                        addressLine2: canonicalPerson.addressLine2 ?? '',
                        city: canonicalPerson.city ?? '',
                        state: canonicalPerson.state ?? '',
                        zip: canonicalPerson.zip ?? '',
                      })
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContactInfo}
                    disabled={isUpdating}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Save
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">First Name</label>
                    <Input
                      value={editFields.firstName}
                      onChange={e => setEditFields(f => ({ ...f, firstName: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Last Name</label>
                    <Input
                      value={editFields.lastName}
                      onChange={e => setEditFields(f => ({ ...f, lastName: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Title</label>
                  <Input
                    value={editFields.currentTitle}
                    onChange={e => setEditFields(f => ({ ...f, currentTitle: e.target.value }))}
                    placeholder="e.g. Managing Director"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Company</label>
                  <Input
                    value={editFields.companyName}
                    onChange={e => setEditFields(f => ({ ...f, companyName: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Email</label>
                  <Input
                    value={editFields.email}
                    onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="h-8 text-sm"
                    type="email"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Work Phone</label>
                    <Input
                      value={editFields.phoneWork}
                      onChange={e => setEditFields(f => ({ ...f, phoneWork: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Cell Phone</label>
                    <Input
                      value={editFields.phoneCell}
                      onChange={e => setEditFields(f => ({ ...f, phoneCell: e.target.value }))}
                      placeholder="(555) 987-6543"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Address</label>
                  <Input
                    value={editFields.addressLine1}
                    onChange={e => setEditFields(f => ({ ...f, addressLine1: e.target.value }))}
                    placeholder="123 Main Street"
                    className="h-8 text-sm"
                  />
                </div>
                {(editFields.addressLine2 || editFields.addressLine1) && (
                  <div>
                    <label className="text-[10px] text-muted-foreground">Address Line 2</label>
                    <Input
                      value={editFields.addressLine2}
                      onChange={e => setEditFields(f => ({ ...f, addressLine2: e.target.value }))}
                      placeholder="Suite 100"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">City</label>
                    <Input
                      value={editFields.city}
                      onChange={e => setEditFields(f => ({ ...f, city: e.target.value }))}
                      placeholder="City"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">State</label>
                    <Input
                      value={editFields.state}
                      onChange={e => setEditFields(f => ({ ...f, state: e.target.value }))}
                      placeholder="CA"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">ZIP</label>
                    <Input
                      value={editFields.zip}
                      onChange={e => setEditFields(f => ({ ...f, zip: e.target.value }))}
                      placeholder="90210"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">LinkedIn URL</label>
                  <Input
                    value={editFields.linkedInUrl}
                    onChange={e => setEditFields(f => ({ ...f, linkedInUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {canonicalPerson.currentTitle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title</span>
                    <span>{canonicalPerson.currentTitle}</span>
                  </div>
                )}
                {canonicalPerson.currentCompany && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span>{canonicalPerson.currentCompany.name}</span>
                  </div>
                )}
                {canonicalPerson.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </span>
                    <a
                      href={`mailto:${canonicalPerson.email}`}
                      className="text-primary hover:underline text-xs"
                    >
                      {canonicalPerson.email}
                    </a>
                  </div>
                )}
                {(canonicalPerson.phoneWork || canonicalPerson.phone) && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Work
                    </span>
                    <span className="text-xs">{canonicalPerson.phoneWork || canonicalPerson.phone}</span>
                  </div>
                )}
                {canonicalPerson.phoneCell && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Cell
                    </span>
                    <span className="text-xs">{canonicalPerson.phoneCell}</span>
                  </div>
                )}
                {canonicalPerson.addressLine1 && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Address
                    </span>
                    <div className="text-xs text-right">
                      <div>{canonicalPerson.addressLine1}</div>
                      {canonicalPerson.addressLine2 && <div>{canonicalPerson.addressLine2}</div>}
                      {(canonicalPerson.city || canonicalPerson.state || canonicalPerson.zip) && (
                        <div>
                          {[canonicalPerson.city, canonicalPerson.state].filter(Boolean).join(', ')}
                          {canonicalPerson.zip && ` ${canonicalPerson.zip}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {canonicalPerson.linkedInUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </span>
                    <a
                      href={canonicalPerson.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {!canonicalPerson.currentTitle && !canonicalPerson.email && !canonicalPerson.phoneWork && !canonicalPerson.phone && !canonicalPerson.phoneCell && !canonicalPerson.linkedInUrl && !canonicalPerson.currentCompany && (
                  <p className="text-xs text-muted-foreground italic">
                    No contact info yet.{' '}
                    <button onClick={() => setIsEditing(true)} className="text-primary hover:underline">
                      Add details
                    </button>
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Category & Description */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Classification
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Category</label>
                <div className="flex gap-1.5 flex-wrap">
                  {CONTACT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      disabled={isUpdating}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-md border transition-colors',
                        category === cat
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {CONTACT_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Description</label>
                <Input
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  placeholder="e.g. patents attorney, tax accountant..."
                  className="h-8 text-sm"
                  disabled={isUpdating}
                />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Notes
            </h3>
            <Textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes about this contact..."
              className="text-sm min-h-[80px] resize-y"
              disabled={isUpdating}
            />
          </section>

          {/* Buyer Link */}
          {dealBuyer && (
            <section>
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                Buyer Link
              </h3>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span>{dealBuyer.canonicalCompany.name}</span>
                </div>
              </div>
            </section>
          )}

          {/* Metadata */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={isActive ? 'text-green-600' : 'text-muted-foreground'}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>
                  {new Date(createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="pt-2 border-t space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleTogglePrimary}
              disabled={isUpdating}
            >
              {isPrimary ? 'Remove Primary' : 'Set as Primary'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={handleRemove}
              disabled={isUpdating}
            >
              Remove from Deal
            </Button>
          </section>
        </div>
      </div>
    </>
  )
}
