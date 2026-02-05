'use client'

import { cn } from '@/lib/utils'
import { EngagementDot } from '../shared/EngagementDot'
import { BuyerTypeBadge } from '../shared/BuyerTypeBadge'

interface Offer {
  buyerId: string
  companyName: string
  buyerType: string
  offerType: 'IOI' | 'LOI'
  amount: number
  deadline: string | null
  exclusivityStart: string | null
  exclusivityEnd: string | null
  engagementLevel: 'hot' | 'warm' | 'cold'
  docViewsTotal: number
  lastActive: string | null
  notes: string | null
}

interface OfferComparisonProps {
  offers: Offer[]
  onBuyerClick: (buyerId: string) => void
}

function getDeadlineStyle(deadline: string | null): string {
  if (!deadline) return 'text-muted-foreground'
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 3) return 'text-rose-600 font-medium'
  if (days <= 7) return 'text-amber-600'
  return 'text-muted-foreground'
}

function getDeadlineLabel(deadline: string | null): string | null {
  if (!deadline) return null
  const date = new Date(deadline)
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (days < 3) return `Deadline: ${formatted} — action required`
  if (days <= 7) return `Deadline: ${formatted} (this week)`
  return `Deadline: ${formatted}`
}

export function OfferComparison({ offers, onBuyerClick }: OfferComparisonProps) {
  if (offers.length < 2) return null

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
      notation: amount >= 1_000_000 ? 'compact' : 'standard',
    }).format(amount)

  return (
    <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 dark:bg-amber-900/10 p-6 mb-6">
      <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
        OFFERS ON THE TABLE
      </h3>

      <div className={cn(
        'grid gap-4 mt-4',
        offers.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}>
        {offers.slice(0, 3).map(offer => {
          const deadlineLabel = getDeadlineLabel(offer.deadline)
          const deadlineStyle = getDeadlineStyle(offer.deadline)

          return (
            <div
              key={offer.buyerId}
              className="rounded-lg border border-border/50 bg-card p-4"
            >
              <p className="text-sm font-semibold text-foreground">{offer.companyName}</p>
              <BuyerTypeBadge type={offer.buyerType} className="mt-1" />

              <p className="text-xl font-bold text-[var(--burnt-orange)] mt-2">
                {formatAmount(offer.amount)}
              </p>
              <p className="text-xs text-muted-foreground">{offer.offerType}</p>

              {offer.notes && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {offer.notes}
                </p>
              )}

              {deadlineLabel && (
                <p className={cn('text-xs mt-2', deadlineStyle)}>{deadlineLabel}</p>
              )}

              {offer.exclusivityEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Exclusivity ends{' '}
                  {new Date(offer.exclusivityEnd).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <EngagementDot level={offer.engagementLevel} />
                <span>{offer.docViewsTotal} docs viewed</span>
              </div>

              <button
                onClick={() => onBuyerClick(offer.buyerId)}
                className="text-xs text-[var(--burnt-orange)] mt-3 hover:underline"
              >
                View Details
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
