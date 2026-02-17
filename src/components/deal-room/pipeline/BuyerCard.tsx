'use client'

export interface PipelineBuyer {
  id: string
  companyName: string
  buyerType: string
  tier: string
  currentStage: string
  stageUpdatedAt: string
  stageLabel: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'HOLD' | 'DENIED'
  createdAt: string
  qualityScore: number | null
  canonicalCompanyId: string
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
  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onChangeStage) {
      e.preventDefault()
      onChangeStage(buyer.id)
    } else {
      onClick(buyer.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(buyer.id)
    }
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
      className={`w-full rounded-lg bg-card border border-border/50 px-3 py-2.5 mb-2 cursor-move
        hover:border-[var(--burnt-orange)]/30 hover:shadow-sm transition-all text-left
        focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/50 focus:ring-offset-2
        ${isDragging ? 'opacity-50 scale-95' : ''}`}
      aria-label={`${buyer.companyName} - drag to change stage, press M to move, or click to view details`}
    >
      <div className="flex items-center gap-2">
        {buyer.approvalStatus === 'APPROVED' && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        )}
        {buyer.approvalStatus === 'DENIED' && (
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        )}
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {buyer.companyName}
        </p>
      </div>
    </button>
  )
}
