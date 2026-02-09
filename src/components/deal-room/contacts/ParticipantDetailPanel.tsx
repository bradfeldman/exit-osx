'use client'

import { useState } from 'react'
import { X, Mail, Phone, Linkedin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SideBadge } from './SideBadge'
import { useDealParticipants } from '@/hooks/useContactSystem'
import {
  PARTICIPANT_ROLE_LABELS,
  PARTICIPANT_SIDE_LABELS,
  ROLES_BY_SIDE,
} from '@/lib/contact-system/constants'
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
  const { updateParticipant, removeParticipant } = useDealParticipants(dealId)

  const { canonicalPerson, side, role, isPrimary, isActive, dealBuyer, createdAt } = participant
  const fullName = `${canonicalPerson.firstName} ${canonicalPerson.lastName}`
  const initials = `${canonicalPerson.firstName.charAt(0)}${canonicalPerson.lastName.charAt(0)}`.toUpperCase()

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { role: newRole })
      onUpdate()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSideChange = async (newSide: string) => {
    setIsUpdating(true)
    try {
      // Reset buyer link if changing away from buyer
      const updates: Record<string, unknown> = { side: newSide }
      if (newSide !== 'BUYER') updates.dealBuyerId = null
      await updateParticipant(participant.id, updates as { side: string; dealBuyerId?: null })
      onUpdate()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTogglePrimary = async () => {
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { isPrimary: !isPrimary })
      onUpdate()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeactivate = async () => {
    setIsUpdating(true)
    try {
      await updateParticipant(participant.id, { isActive: !isActive })
      onUpdate()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    setIsUpdating(true)
    try {
      await removeParticipant(participant.id)
      onUpdate()
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false)
    }
  }

  const validRoles = ROLES_BY_SIDE[side] ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[500px] bg-card border-l border-border shadow-xl z-50 flex flex-col">
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
              <h2 className="text-lg font-semibold text-foreground pr-8">{fullName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <SideBadge side={side} />
                <span className="text-xs text-muted-foreground">
                  {PARTICIPANT_ROLE_LABELS[role] ?? role}
                </span>
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
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Contact Info
            </h3>
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
              {canonicalPerson.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </span>
                  <span className="text-xs">{canonicalPerson.phone}</span>
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
            </div>
          </section>

          {/* Deal Classification */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Classification
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Side</label>
                <Select value={side} onValueChange={handleSideChange} disabled={isUpdating}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PARTICIPANT_SIDE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Role</label>
                <Select value={role} onValueChange={handleRoleChange} disabled={isUpdating}>
                  <SelectTrigger className="h-8 text-sm">
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
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleDeactivate}
              disabled={isUpdating}
            >
              {isActive ? 'Deactivate' : 'Reactivate'}
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
