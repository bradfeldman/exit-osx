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

const APPROVAL_COLORS: Record<string, { border: string; band: string }> = {
  APPROVED: { border: 'border-emerald-500/60', band: 'bg-emerald-500' },
  PENDING: { border: 'border-border/50', band: 'bg-muted-foreground/40' },
  HOLD: { border: 'border-amber-500/60', band: 'bg-amber-500' },
  DENIED: { border: 'border-red-500/60', band: 'bg-red-500' },
}

const BUYER_TYPE_LETTER: Record<string, string> = {
  STRATEGIC: 'S',
  FINANCIAL: 'F',
  INDIVIDUAL: 'I',
  MANAGEMENT: 'M',
  ESOP: 'E',
  OTHER: 'O',
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

  const colors = APPROVAL_COLORS[buyer.approvalStatus] ?? APPROVAL_COLORS.PENDING
  const typeLetter = BUYER_TYPE_LETTER[buyer.buyerType] ?? ''
  const scoreLabel = buyer.qualityScore != null ? String(buyer.qualityScore) : ''
  const badge = typeLetter || scoreLabel ? `${typeLetter}${scoreLabel}` : ''

  return (
    <button
      draggable
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full rounded-lg bg-card border ${colors.border} px-3 py-2.5 mb-2 cursor-move
        hover:shadow-sm transition-all text-left overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/50 focus:ring-offset-2
        ${isDragging ? 'opacity-50 scale-95' : ''}`}
      aria-label={`${buyer.companyName} - drag to change stage, press M to move, or click to view details`}
    >
      <div className="flex items-center gap-2">
        {/* Approval color band */}
        <span className={`w-1 self-stretch rounded-full shrink-0 ${colors.band}`} />

        <p className="text-sm font-medium text-foreground line-clamp-2 flex-1 min-w-0">
          {buyer.companyName}
        </p>

        {/* Type letter + quality score */}
        {badge && (
          <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0 tabular-nums">
            {badge}
          </span>
        )}
      </div>
    </button>
  )
}
