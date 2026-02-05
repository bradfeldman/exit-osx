'use client'

import { PipelineColumn } from './PipelineColumn'
import { ExitedBuyersSection } from './ExitedBuyersSection'
import { AddBuyerForm } from './AddBuyerForm'
import { OfferComparison } from './OfferComparison'
import type { PipelineBuyer } from './BuyerCard'

interface PipelineStage {
  visualStage: string
  label: string
  buyerCount: number
  buyers: PipelineBuyer[]
}

interface ExitedBuyer {
  id: string
  companyName: string
  exitStage: string
  exitReason: string | null
  exitedAt: string
}

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

interface PipelineViewProps {
  pipeline: {
    totalBuyers: number
    activeBuyers: number
    exitedBuyers: number
    offersReceived: number
    stages: PipelineStage[]
    exitedBuyersSummary: ExitedBuyer[]
  }
  offers: Offer[]
  onBuyerClick: (buyerId: string) => void
  onAddBuyer: (data: {
    companyName: string
    buyerType: string
    contactName: string
    contactEmail: string
    notes?: string
  }) => void
  isAddingBuyer: boolean
}

export function PipelineView({
  pipeline,
  offers,
  onBuyerClick,
  onAddBuyer,
  isAddingBuyer,
}: PipelineViewProps) {
  const ndaCount = pipeline.stages
    .filter(s => ['under_nda', 'offer_received', 'diligence', 'closed'].includes(s.visualStage))
    .reduce((sum, s) => sum + s.buyerCount, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          YOUR PIPELINE
        </h2>
        <span className="text-xs text-muted-foreground">
          {pipeline.totalBuyers} buyers
          {pipeline.offersReceived > 0 && ` · ${pipeline.offersReceived} offers`}
          {ndaCount > 0 && ` · ${ndaCount} under NDA`}
        </span>
      </div>

      {/* Offer Comparison */}
      <OfferComparison offers={offers} onBuyerClick={onBuyerClick} />

      {/* Pipeline Empty State */}
      {pipeline.activeBuyers === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Your pipeline is empty. Add your first buyer to start tracking the process.
        </div>
      )}

      {/* Stage Columns */}
      {pipeline.activeBuyers > 0 && (
        <div className="grid grid-cols-6 gap-3">
          {pipeline.stages.map(stage => (
            <PipelineColumn
              key={stage.visualStage}
              label={stage.label}
              buyerCount={stage.buyerCount}
              buyers={stage.buyers}
              onBuyerClick={onBuyerClick}
            />
          ))}
        </div>
      )}

      {/* Exited Buyers */}
      <ExitedBuyersSection buyers={pipeline.exitedBuyersSummary} />

      {/* Add Buyer */}
      <AddBuyerForm onAdd={onAddBuyer} isAdding={isAddingBuyer} />
    </div>
  )
}
