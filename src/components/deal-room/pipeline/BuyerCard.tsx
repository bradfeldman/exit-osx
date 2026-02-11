'use client'

import { BuyerTypeBadge } from '../shared/BuyerTypeBadge'
import { TierBadge } from '../shared/TierBadge'
import { EngagementDot } from '../shared/EngagementDot'
import { OfferAmount } from '../shared/OfferAmount'

export interface PipelineBuyer {
  id: string
  companyName: string
  buyerType: string
  tier: string
  currentStage: string
  stageUpdatedAt: string
  stageLabel: string
  primaryContact: { name: string; email: string; title: string | null } | null
  ioiAmount: number | null
  loiAmount: number | null
  offerType: 'IOI' | 'LOI' | null
  offerDeadline: string | null
  exclusivityEnd: string | null
  engagementLevel: 'hot' | 'warm' | 'cold' | 'none'
  lastActivity: string | null
  docViewsLast7Days: number
  internalNotes: string | null
  tags: string[]
}

interface BuyerCardProps {
  buyer: PipelineBuyer
  onClick: (buyerId: string) => void
  onChangeStage?: (buyerId: string) => void
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

export function BuyerCard({
  buyer,
  onClick,
  onChangeStage,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: BuyerCardProps) {
  const stageDate = new Date(buyer.stageUpdatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const offerAmount = buyer.loiAmount ?? buyer.ioiAmount

  const handleClick = (e: React.MouseEvent) => {
    // Shift+Click or touch hold opens stage picker
    if (e.shiftKey && onChangeStage) {
      e.preventDefault()
      onChangeStage(buyer.id)
    } else {
      onClick(buyer.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter or Space opens detail panel
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(buyer.id)
    }
    // 'M' for Move opens stage picker
    if ((e.key === 'm' || e.key === 'M') && onChangeStage) {
      e.preventDefault()
      onChangeStage(buyer.id)
    }
  }

  return (
    <button
      draggable
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full rounded-lg bg-card border border-border/50 p-3 mb-2 cursor-move
        hover:border-[var(--burnt-orange)]/30 hover:shadow-sm transition-all text-left relative
        focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/50 focus:ring-offset-2
        ${isDragging ? 'opacity-50 scale-95' : ''}`}
      aria-label={`${buyer.companyName} - drag to change stage, press M to move, or click to view details`}
    >
      <EngagementDot
        level={buyer.engagementLevel}
        className="absolute top-2 right-2"
      />

      <p className="text-sm font-medium text-foreground line-clamp-2 pr-4">
        {buyer.companyName}
      </p>

      <div className="flex items-center gap-1 mt-1">
        <BuyerTypeBadge type={buyer.buyerType} />
        <TierBadge tier={buyer.tier} />
      </div>

      <p className="text-[10px] text-muted-foreground mt-1">
        {buyer.stageLabel} {stageDate}
      </p>

      {offerAmount && buyer.offerType && (
        <div className="mt-1">
          <OfferAmount amount={offerAmount} type={buyer.offerType} />
        </div>
      )}
    </button>
  )
}
