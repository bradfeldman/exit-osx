'use client'

import { useState } from 'react'
import { PipelineColumn } from './PipelineColumn'
import { ExitedBuyersSection } from './ExitedBuyersSection'
import { AddBuyerForm } from './AddBuyerForm'
import { OfferComparison } from './OfferComparison'
import { StagePickerDialog } from './StagePickerDialog'
import { getVisualStage } from '@/lib/deal-room/visual-stages'
import type { PipelineBuyer } from './BuyerCard'
import type { DealStage } from '@prisma/client'

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
  companyId?: string | null
  onBuyerClick: (buyerId: string) => void
  onStageChange: (buyerId: string, newVisualStage: string) => Promise<void>
  onRefresh?: () => void
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
  companyId,
  onBuyerClick,
  onStageChange,
  onRefresh,
  onAddBuyer,
  isAddingBuyer,
}: PipelineViewProps) {
  const [draggedBuyerId, setDraggedBuyerId] = useState<string | null>(null)
  const [stagePickerOpen, setStagePickerOpen] = useState(false)
  const [selectedBuyerForMove, setSelectedBuyerForMove] = useState<PipelineBuyer | null>(null)

  const ndaCount = pipeline.stages
    .filter(s => ['under_nda', 'offer_received', 'diligence', 'closed'].includes(s.visualStage))
    .reduce((sum, s) => sum + s.buyerCount, 0)

  const handleDragStart = (buyerId: string) => {
    setDraggedBuyerId(buyerId)
  }

  const handleDragEnd = () => {
    setDraggedBuyerId(null)
  }

  const handleDrop = async (buyerId: string, targetVisualStage: string) => {
    // Find current stage of dragged buyer
    const currentStage = pipeline.stages.find(s =>
      s.buyers.some(b => b.id === buyerId)
    )

    // Don't update if dropped on same stage
    if (currentStage?.visualStage === targetVisualStage) {
      handleDragEnd()
      return
    }

    try {
      await onStageChange(buyerId, targetVisualStage)
    } catch (error) {
      console.error('Failed to update stage:', error)
    } finally {
      handleDragEnd()
    }
  }

  const handleOpenStagePicker = (buyerId: string) => {
    const buyer = pipeline.stages
      .flatMap(s => s.buyers)
      .find(b => b.id === buyerId)

    if (buyer) {
      setSelectedBuyerForMove(buyer)
      setStagePickerOpen(true)
    }
  }

  const handleStageSelect = async (visualStage: string) => {
    if (selectedBuyerForMove) {
      await onStageChange(selectedBuyerForMove.id, visualStage)
    }
  }

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
              visualStage={stage.visualStage}
              label={stage.label}
              buyerCount={stage.buyerCount}
              buyers={stage.buyers}
              onBuyerClick={onBuyerClick}
              onChangeStage={handleOpenStagePicker}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              isDragging={draggedBuyerId !== null}
              draggedBuyerId={draggedBuyerId}
            />
          ))}
        </div>
      )}

      {/* Exited Buyers */}
      <ExitedBuyersSection
        buyers={pipeline.exitedBuyersSummary}
        companyId={companyId}
        onRestore={onRefresh}
      />

      {/* Add Buyer */}
      <AddBuyerForm onAdd={onAddBuyer} isAdding={isAddingBuyer} />

      {/* Stage Picker Dialog */}
      {selectedBuyerForMove && (
        <StagePickerDialog
          isOpen={stagePickerOpen}
          onClose={() => {
            setStagePickerOpen(false)
            setSelectedBuyerForMove(null)
          }}
          buyerName={selectedBuyerForMove.companyName}
          currentStage={getVisualStage(selectedBuyerForMove.currentStage as DealStage) as string}
          onStageSelect={handleStageSelect}
        />
      )}
    </div>
  )
}
