'use client'

import { BuyerCard, type PipelineBuyer } from './BuyerCard'

interface PipelineColumnProps {
  label: string
  buyerCount: number
  buyers: PipelineBuyer[]
  onBuyerClick: (buyerId: string) => void
}

export function PipelineColumn({ label, buyerCount, buyers, onBuyerClick }: PipelineColumnProps) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        {buyerCount > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {buyerCount}
          </span>
        )}
      </div>

      <div className="min-h-[200px] rounded-lg bg-muted/20 border border-border/20 p-2">
        {buyers.map(buyer => (
          <BuyerCard
            key={buyer.id}
            buyer={buyer}
            onClick={onBuyerClick}
          />
        ))}
      </div>
    </div>
  )
}
