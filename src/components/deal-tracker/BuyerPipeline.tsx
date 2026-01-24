'use client'

import { useState } from 'react'
import { DealStage, BuyerType, BuyerTier } from '@prisma/client'
import { BuyerCard } from './BuyerCard'
import { StageChangeModal } from './StageChangeModal'
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from '@/lib/deal-tracker/constants'
import { cn } from '@/lib/utils'

interface ProspectiveBuyer {
  id: string
  name: string
  buyerType: BuyerType
  tier: BuyerTier
  currentStage: DealStage
  website: string | null
  industry: string | null
  location: string | null
  stageUpdatedAt: string
  ioiAmount: number | null
  loiAmount: number | null
  contacts: Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    isPrimary: boolean
  }>
  _count: {
    documents: number
    meetings: number
    activities: number
  }
}

interface BuyerPipelineProps {
  buyers: ProspectiveBuyer[]
  companyId: string
  onBuyerUpdated: () => void
}

export function BuyerPipeline({ buyers, companyId, onBuyerUpdated }: BuyerPipelineProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<ProspectiveBuyer | null>(null)
  const [targetStage, setTargetStage] = useState<DealStage | null>(null)

  // Group buyers by pipeline stage
  const buyersByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    // For pipeline view, group some stages together
    const stageMatches = (buyerStage: DealStage) => {
      if (stage === DealStage.IDENTIFIED) {
        return ['IDENTIFIED', 'SELLER_REVIEWING', 'APPROVED'].includes(buyerStage)
      }
      if (stage === DealStage.TEASER_SENT) {
        return ['TEASER_SENT', 'INTERESTED'].includes(buyerStage)
      }
      if (stage === DealStage.NDA_EXECUTED) {
        return ['NDA_SENT', 'NDA_NEGOTIATING', 'NDA_EXECUTED'].includes(buyerStage)
      }
      if (stage === DealStage.CIM_ACCESS) {
        return ['CIM_ACCESS', 'LEVEL_2_ACCESS', 'LEVEL_3_ACCESS', 'MANAGEMENT_MEETING_SCHEDULED', 'MANAGEMENT_MEETING_COMPLETED'].includes(buyerStage)
      }
      if (stage === DealStage.IOI_RECEIVED) {
        return ['IOI_REQUESTED', 'IOI_RECEIVED', 'IOI_ACCEPTED'].includes(buyerStage)
      }
      if (stage === DealStage.LOI_RECEIVED) {
        return ['LOI_REQUESTED', 'LOI_RECEIVED', 'LOI_SELECTED', 'LOI_BACKUP'].includes(buyerStage)
      }
      if (stage === DealStage.DUE_DILIGENCE) {
        return ['DUE_DILIGENCE', 'PA_DRAFTING', 'PA_NEGOTIATING'].includes(buyerStage)
      }
      if (stage === DealStage.CLOSING) {
        return ['CLOSING', 'CLOSED'].includes(buyerStage)
      }
      return buyerStage === stage
    }

    acc[stage] = buyers.filter(b => stageMatches(b.currentStage))
    return acc
  }, {} as Record<DealStage, ProspectiveBuyer[]>)

  const handleStageChange = (buyer: ProspectiveBuyer, stage: DealStage) => {
    setSelectedBuyer(buyer)
    setTargetStage(stage)
  }

  const handleStageChangeComplete = () => {
    setSelectedBuyer(null)
    setTargetStage(null)
    onBuyerUpdated()
  }

  // Pipeline stage labels for display
  const pipelineStageLabels: Record<DealStage, string> = {
    ...STAGE_LABELS,
    [DealStage.IDENTIFIED]: 'Identification',
    [DealStage.TEASER_SENT]: 'Marketing',
    [DealStage.NDA_EXECUTED]: 'NDA',
    [DealStage.CIM_ACCESS]: 'Diligence',
    [DealStage.IOI_RECEIVED]: 'IOI',
    [DealStage.LOI_RECEIVED]: 'LOI',
    [DealStage.DUE_DILIGENCE]: 'Due Diligence',
    [DealStage.CLOSING]: 'Closing',
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-4 min-w-full">
        {PIPELINE_STAGES.map((stage) => {
          const stageBuyers = buyersByStage[stage] || []
          const colors = STAGE_COLORS[stage]

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72 bg-muted/50 rounded-lg"
            >
              {/* Column Header */}
              <div className={cn(
                'px-3 py-2 rounded-t-lg border-b',
                colors.bg,
                colors.border
              )}>
                <div className="flex items-center justify-between">
                  <h3 className={cn('font-medium text-sm', colors.text)}>
                    {pipelineStageLabels[stage]}
                  </h3>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    colors.bg,
                    colors.text
                  )}>
                    {stageBuyers.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto">
                {stageBuyers.map((buyer) => (
                  <BuyerCard
                    key={buyer.id}
                    buyer={buyer}
                    _companyId={companyId}
                    onStageChange={(newStage) => handleStageChange(buyer, newStage)}
                    _onUpdated={onBuyerUpdated}
                  />
                ))}
                {stageBuyers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No buyers
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stage Change Modal */}
      {selectedBuyer && targetStage && (
        <StageChangeModal
          buyer={selectedBuyer}
          targetStage={targetStage}
          companyId={companyId}
          isOpen={true}
          onClose={() => {
            setSelectedBuyer(null)
            setTargetStage(null)
          }}
          onComplete={handleStageChangeComplete}
        />
      )}
    </div>
  )
}
