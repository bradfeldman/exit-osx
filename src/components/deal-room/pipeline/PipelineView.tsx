'use client'

import { useState, useCallback } from 'react'
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

interface PendingDrop {
  buyerId: string
  buyerName: string
  targetVisualStage: string
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
  onStageChange: (buyerId: string, newVisualStage: string, overrideApproval?: boolean) => Promise<void>
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
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

  const ndaCount = pipeline.stages
    .filter(s => ['under_nda', 'offer_received', 'diligence', 'closed'].includes(s.visualStage))
    .reduce((sum, s) => sum + s.buyerCount, 0)

  const handleDragStart = (buyerId: string) => {
    setDraggedBuyerId(buyerId)
  }

  const handleDragEnd = () => {
    setDraggedBuyerId(null)
  }

  const findBuyerAndStage = useCallback((buyerId: string) => {
    for (const stage of pipeline.stages) {
      const buyer = stage.buyers.find(b => b.id === buyerId)
      if (buyer) return { buyer, visualStage: stage.visualStage }
    }
    return null
  }, [pipeline.stages])

  const handleDrop = async (buyerId: string, targetVisualStage: string) => {
    const found = findBuyerAndStage(buyerId)
    if (!found) { handleDragEnd(); return }

    const { buyer, visualStage: sourceStage } = found

    // Don't update if dropped on same stage
    if (sourceStage === targetVisualStage) {
      handleDragEnd()
      return
    }

    // Check if moving from Prospect to a later stage with unapproved status
    const isFromProspect = sourceStage === 'identified'
    const isMovingForward = targetVisualStage !== 'identified'
    const isUnapproved = ['PENDING', 'HOLD', 'DENIED'].includes(buyer.approvalStatus)

    if (isFromProspect && isMovingForward && isUnapproved) {
      // Show confirmation dialog
      setPendingDrop({
        buyerId,
        buyerName: buyer.companyName,
        targetVisualStage,
      })
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

  const handleConfirmUnapprovedMove = async () => {
    if (!pendingDrop) return
    try {
      await onStageChange(pendingDrop.buyerId, pendingDrop.targetVisualStage, true)
    } catch (error) {
      console.error('Failed to update stage:', error)
    } finally {
      setPendingDrop(null)
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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

      {/* Unapproved Move Confirmation Dialog */}
      {pendingDrop && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setPendingDrop(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Move unapproved prospect?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{pendingDrop.buyerName}</span> is not currently approved. Are you sure you want to advance this prospect?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDrop(null)}
                className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnapprovedMove}
                className="text-sm px-3 py-1.5 rounded-md bg-[var(--burnt-orange)] text-white hover:opacity-90 transition-opacity"
              >
                Yes, move anyway
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
