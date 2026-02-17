'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, Archive, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { PipelineBuyer } from './BuyerCard'

const STAGE_OPTIONS = [
  { value: 'identified', label: 'Prospect' },
  { value: 'engaged', label: 'Teaser Sent' },
  { value: 'under_nda', label: 'NDA Signed' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'diligence', label: 'Diligence' },
  { value: 'closed', label: 'Closed' },
]

const APPROVAL_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: 'text-muted-foreground' },
  { value: 'APPROVED', label: 'Approved', color: 'text-emerald-600' },
  { value: 'HOLD', label: 'Hold', color: 'text-amber-600' },
  { value: 'DENIED', label: 'Denied', color: 'text-red-600' },
]

const BUYER_TYPE_OPTIONS = [
  { value: '', label: '' },
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'ESOP', label: 'ESOP' },
  { value: 'OTHER', label: 'Other' },
]

const QUALITY_OPTIONS = [
  { value: '', label: '' },
  { value: 1, label: '1 - Excellent' },
  { value: 2, label: '2 - Good' },
  { value: 3, label: '3 - Average' },
  { value: 4, label: '4 - Below Average' },
  { value: 5, label: '5 - Poor' },
]

interface Participant {
  id: string
  canonicalPersonId: string
  firstName: string
  lastName: string
  currentTitle: string | null
  email: string | null
  isPrimary: boolean
  role: string
  category: string | null
}

interface BuyerDetailPanelProps {
  buyer: PipelineBuyer
  companyId: string | null
  onClose: () => void
  onStageChange: () => void
  onBuyerFieldUpdate: (buyerId: string, fields: Partial<PipelineBuyer>) => void
}

export function BuyerDetailPanel({ buyer, companyId, onClose, onStageChange, onBuyerFieldUpdate }: BuyerDetailPanelProps) {
  const [showStageSelect, setShowStageSelect] = useState(false)
  const [isChangingStage, setIsChangingStage] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  // Editable fields (local state)
  const [approvalStatus, setApprovalStatus] = useState(buyer.approvalStatus)
  const [buyerType, setBuyerType] = useState(buyer.buyerType || '')
  const [qualityScore, setQualityScore] = useState<number | ''>(buyer.qualityScore ?? '')
  const [notes, setNotes] = useState(buyer.internalNotes ?? '')

  // Contacts
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)

  const notesRef = useRef<HTMLTextAreaElement>(null)

  const patchBuyer = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return
    try {
      const res = await fetch(
        `/api/companies/${companyId}/deal-room/buyers/${buyer.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      if (!res.ok) throw new Error('Failed to update')
      return true
    } catch {
      toast.error('Failed to save changes')
      return false
    }
  }, [companyId, buyer.id])

  // Fetch participants on mount
  useEffect(() => {
    if (!companyId) return
    setIsLoadingParticipants(true)
    fetch(`/api/companies/${companyId}/deal-room/buyers/${buyer.id}/participants`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setParticipants(data.participants ?? []))
      .catch(() => {})
      .finally(() => setIsLoadingParticipants(false))
  }, [companyId, buyer.id])

  const handleApprovalChange = async (value: string) => {
    setApprovalStatus(value as PipelineBuyer['approvalStatus'])
    const ok = await patchBuyer({ approvalStatus: value })
    if (ok) {
      onBuyerFieldUpdate(buyer.id, { approvalStatus: value as PipelineBuyer['approvalStatus'] })
    }
  }

  const handleBuyerTypeChange = async (value: string) => {
    setBuyerType(value)
    if (value === '') return // blank = no-op
    const ok = await patchBuyer({ buyerType: value })
    if (ok) {
      onBuyerFieldUpdate(buyer.id, { buyerType: value })
    }
  }

  const handleQualityChange = async (value: string) => {
    if (value === '') {
      setQualityScore('')
      return
    }
    const num = parseInt(value)
    if (isNaN(num)) return
    setQualityScore(num)
    const ok = await patchBuyer({ qualityScore: num })
    if (ok) {
      onBuyerFieldUpdate(buyer.id, { qualityScore: num })
    }
  }

  const handleNotesBlur = async () => {
    if (notes !== (buyer.internalNotes ?? '')) {
      const ok = await patchBuyer({ internalNotes: notes })
      if (ok) {
        onBuyerFieldUpdate(buyer.id, { internalNotes: notes })
      }
    }
  }

  const handleSetLead = async (participantId: string) => {
    if (!companyId) return
    try {
      const res = await fetch(
        `/api/companies/${companyId}/deal-room/buyers/${buyer.id}/participants`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, isPrimary: true }),
        }
      )
      if (!res.ok) throw new Error('Failed to update')
      // Update local state
      setParticipants(prev =>
        prev.map(p => ({ ...p, isPrimary: p.id === participantId }))
          .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
      )
      toast.success('Lead contact updated')
    } catch {
      toast.error('Failed to update lead contact')
    }
  }

  const dateAdded = new Date(buyer.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

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
          <h2 className="text-lg font-semibold text-foreground pr-8">{buyer.companyName}</h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Overview
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date Added</span>
                <span>{dateAdded}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Approval Status</span>
                <select
                  value={approvalStatus}
                  onChange={e => handleApprovalChange(e.target.value)}
                  className={`text-sm bg-transparent border border-border/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--burnt-orange)] ${
                    APPROVAL_OPTIONS.find(o => o.value === approvalStatus)?.color ?? ''
                  }`}
                >
                  {APPROVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Buyer Type</span>
                <select
                  value={buyerType}
                  onChange={e => handleBuyerTypeChange(e.target.value)}
                  className="text-sm bg-transparent border border-border/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--burnt-orange)]"
                >
                  {BUYER_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quality Score</span>
                <select
                  value={qualityScore}
                  onChange={e => handleQualityChange(e.target.value)}
                  className="text-sm bg-transparent border border-border/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--burnt-orange)]"
                >
                  {QUALITY_OPTIONS.map(opt => (
                    <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Contacts */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Contacts
            </h3>
            {isLoadingParticipants ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : participants.length === 0 ? (
              <p className="text-xs text-muted-foreground">No contacts linked to this buyer</p>
            ) : (
              <div className="space-y-2">
                {participants.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {p.isPrimary && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className={`text-sm block truncate ${p.isPrimary ? 'font-semibold' : ''}`}>
                          {p.firstName} {p.lastName}
                        </span>
                        {p.currentTitle && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {p.currentTitle}
                          </span>
                        )}
                      </div>
                    </div>
                    {!p.isPrimary && (
                      <button
                        onClick={() => handleSetLead(p.id)}
                        className="text-[10px] text-muted-foreground hover:text-[var(--burnt-orange)] transition-colors shrink-0 ml-2"
                      >
                        Set Lead
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Notes
            </h3>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes about this buyer..."
              rows={4}
              className="w-full text-sm bg-transparent border border-border/50 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--burnt-orange)] placeholder:text-muted-foreground/50"
            />
          </section>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border/50 bg-card space-y-2">
          {showStageSelect && (
            <div className="flex flex-wrap gap-1.5 pb-2">
              {STAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={isChangingStage}
                  onClick={async () => {
                    if (!companyId) return
                    setIsChangingStage(true)
                    try {
                      const res = await fetch(
                        `/api/companies/${companyId}/deal-room/buyers/${buyer.id}`,
                        {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ stage: opt.value }),
                        }
                      )
                      if (res.ok) {
                        onStageChange()
                        onClose()
                      }
                    } finally {
                      setIsChangingStage(false)
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-border/50 hover:border-[var(--burnt-orange)] hover:text-[var(--burnt-orange)] transition-colors disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStageSelect(!showStageSelect)}
              disabled={isChangingStage}
            >
              {isChangingStage ? 'Updating...' : 'Change Stage'}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={isArchiving}
              onClick={async () => {
                if (!companyId) return
                setIsArchiving(true)
                try {
                  const res = await fetch(
                    `/api/companies/${companyId}/deal-room/buyers/${buyer.id}`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'archive' }),
                    }
                  )
                  if (res.ok) {
                    onStageChange()
                    onClose()
                  }
                } finally {
                  setIsArchiving(false)
                }
              }}
            >
              <Archive className="mr-1 h-3 w-3" />
              {isArchiving ? 'Archiving...' : 'Archive'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
