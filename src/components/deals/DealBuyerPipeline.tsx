'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { DealStage, ApprovalStatus } from '@prisma/client'
import { DealBuyerCard } from './DealBuyerCard'
import { StageChangeModal } from '../deal-tracker/StageChangeModal'
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from '@/lib/deal-tracker/constants'
import { cn } from '@/lib/utils'
import { Users, ArrowRight } from 'lucide-react'
import type { DealBuyer } from './types'

const columnVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  }),
}

const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

interface DealBuyerPipelineProps {
  buyers: DealBuyer[]
  dealId: string
  onBuyerUpdated: () => void
}

export function DealBuyerPipeline({ buyers, dealId, onBuyerUpdated }: DealBuyerPipelineProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<DealBuyer | null>(null)
  const [targetStage, setTargetStage] = useState<DealStage | null>(null)
  const [_isUpdating, setIsUpdating] = useState(false)

  // Group buyers by pipeline stage
  const buyersByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
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
          return [
            'CIM_ACCESS',
            'LEVEL_2_ACCESS',
            'LEVEL_3_ACCESS',
            'MANAGEMENT_MEETING_SCHEDULED',
            'MANAGEMENT_MEETING_COMPLETED',
          ].includes(buyerStage)
        }
        if (stage === DealStage.IOI_RECEIVED) {
          return ['IOI_REQUESTED', 'IOI_RECEIVED', 'IOI_ACCEPTED'].includes(buyerStage)
        }
        if (stage === DealStage.LOI_RECEIVED) {
          return ['LOI_REQUESTED', 'LOI_RECEIVED', 'LOI_SELECTED', 'LOI_BACKUP'].includes(
            buyerStage
          )
        }
        if (stage === DealStage.DUE_DILIGENCE) {
          return ['DUE_DILIGENCE', 'PA_DRAFTING', 'PA_NEGOTIATING'].includes(buyerStage)
        }
        if (stage === DealStage.CLOSING) {
          return ['CLOSING', 'CLOSED'].includes(buyerStage)
        }
        return buyerStage === stage
      }

      acc[stage] = buyers.filter((b) => stageMatches(b.currentStage))
      return acc
    },
    {} as Record<DealStage, DealBuyer[]>
  )

  const handleStageChange = (buyer: DealBuyer, stage: DealStage) => {
    setSelectedBuyer(buyer)
    setTargetStage(stage)
  }

  const handleApprovalChange = async (buyer: DealBuyer, status: ApprovalStatus) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/buyers/${buyer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status }),
      })
      if (res.ok) {
        onBuyerUpdated()
      }
    } catch (error) {
      console.error('Error updating approval status:', error)
    } finally {
      setIsUpdating(false)
    }
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

  const totalBuyers = buyers.length

  return (
    <div className="space-y-4">
      {/* Pipeline Flow Indicator */}
      <div className="hidden lg:flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
        {PIPELINE_STAGES.map((stage, idx) => {
          const stageBuyers = buyersByStage[stage] || []
          const colors = STAGE_COLORS[stage]
          const percentage =
            totalBuyers > 0 ? Math.round((stageBuyers.length / totalBuyers) * 100) : 0

          return (
            <div key={stage} className="flex items-center">
              <div className="text-center">
                <span
                  className={cn(
                    'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                    colors.bg,
                    colors.text
                  )}
                >
                  {pipelineStageLabels[stage]}
                </span>
                <div className="mt-1 text-xs text-muted-foreground">
                  {stageBuyers.length} ({percentage}%)
                </div>
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
              )}
            </div>
          )
        })}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 -mx-6 px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          className="inline-flex gap-4 min-w-full"
        >
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageBuyers = buyersByStage[stage] || []
            const colors = STAGE_COLORS[stage]

            return (
              <motion.div
                key={stage}
                custom={idx}
                variants={columnVariants}
                className="flex-shrink-0 w-80"
              >
                {/* Column */}
                <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                  {/* Column Header */}
                  <div className={cn('px-4 py-3 border-b', colors.bg, colors.border)}>
                    <div className="flex items-center justify-between">
                      <h3 className={cn('font-medium text-sm font-display', colors.text)}>
                        {pipelineStageLabels[stage]}
                      </h3>
                      <span
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          colors.bg,
                          colors.text,
                          'bg-white/50 dark:bg-black/20'
                        )}
                      >
                        {stageBuyers.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <motion.div
                    variants={cardContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto"
                  >
                    <AnimatePresence mode="popLayout">
                      {stageBuyers.map((buyer) => (
                        <DealBuyerCard
                          key={buyer.id}
                          buyer={buyer}
                          dealId={dealId}
                          onStageChange={(newStage) => handleStageChange(buyer, newStage)}
                          onApprovalChange={(status) => handleApprovalChange(buyer, status)}
                        />
                      ))}
                    </AnimatePresence>

                    {stageBuyers.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <Users className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground text-sm">No buyers</p>
                        <p className="text-muted-foreground/60 text-xs mt-1">
                          Move buyers here or add new ones
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Stage Change Modal */}
      {selectedBuyer && targetStage && (
        <StageChangeModal
          buyer={{
            id: selectedBuyer.id,
            name: selectedBuyer.canonicalCompany.name,
            currentStage: selectedBuyer.currentStage,
          }}
          targetStage={targetStage}
          companyId={dealId}
          isOpen={true}
          onClose={() => {
            setSelectedBuyer(null)
            setTargetStage(null)
          }}
          onComplete={handleStageChangeComplete}
          apiPath={`/api/deals/${dealId}/buyers/${selectedBuyer.id}/stage`}
        />
      )}
    </div>
  )
}
