import { prisma } from '@/lib/prisma'
import { DealStage, BuyerType, BuyerTier } from '@prisma/client'
import {
  STAGE_GROUPS,
  ACTIVE_STAGES,
  TERMINATED_STAGES,
  COMPLETED_STAGES,
} from './constants'

export interface FunnelMetrics {
  totalBuyers: number
  activeBuyers: number
  terminatedBuyers: number
  closedDeals: number
  byStageGroup: Record<string, number>
  byStage: Record<DealStage, number>
  byType: Record<BuyerType, number>
  byTier: Record<BuyerTier, number>
  conversionRates: {
    teaserToInterested: number
    interestedToNda: number
    ndaToIoi: number
    ioiToLoi: number
    loiToClose: number
    overallClose: number
  }
  timeline: {
    avgDaysToNda: number | null
    avgDaysToIoi: number | null
    avgDaysToLoi: number | null
    avgDaysToClose: number | null
  }
  ioiLoiValues: {
    totalIoiValue: number
    avgIoiValue: number
    totalLoiValue: number
    avgLoiValue: number
    highestIoi: number
    highestLoi: number
  }
}

/**
 * Calculate funnel metrics for a company's deal tracker
 */
export async function calculateFunnelMetrics(companyId: string): Promise<FunnelMetrics> {
  const buyers = await prisma.prospectiveBuyer.findMany({
    where: { companyId },
    include: {
      stageHistory: {
        orderBy: { changedAt: 'asc' },
      },
    },
  })

  const totalBuyers = buyers.length
  const activeBuyers = buyers.filter(b => ACTIVE_STAGES.includes(b.currentStage)).length
  const terminatedBuyers = buyers.filter(b => TERMINATED_STAGES.includes(b.currentStage)).length
  const closedDeals = buyers.filter(b => COMPLETED_STAGES.includes(b.currentStage)).length

  // Count by stage group
  const byStageGroup: Record<string, number> = {}
  for (const groupKey of Object.keys(STAGE_GROUPS)) {
    byStageGroup[groupKey] = 0
  }

  // Count by stage
  const byStage: Record<DealStage, number> = {} as Record<DealStage, number>
  for (const stage of Object.values(DealStage)) {
    byStage[stage] = 0
  }

  // Count by type
  const byType: Record<BuyerType, number> = {} as Record<BuyerType, number>
  for (const type of Object.values(BuyerType)) {
    byType[type] = 0
  }

  // Count by tier
  const byTier: Record<BuyerTier, number> = {} as Record<BuyerTier, number>
  for (const tier of Object.values(BuyerTier)) {
    byTier[tier] = 0
  }

  for (const buyer of buyers) {
    byStage[buyer.currentStage]++
    byType[buyer.buyerType]++
    byTier[buyer.tier]++

    // Find stage group
    for (const [groupKey, group] of Object.entries(STAGE_GROUPS)) {
      if ((group.stages as readonly DealStage[]).includes(buyer.currentStage)) {
        byStageGroup[groupKey]++
        break
      }
    }
  }

  // Calculate conversion rates
  // Count buyers who ever reached each stage
  const everReachedStages = (stages: DealStage[]): number => {
    return buyers.filter(b =>
      stages.some(stage =>
        b.currentStage === stage || b.stageHistory.some(h => h.toStage === stage)
      )
    ).length
  }

  const teaserSent = everReachedStages([DealStage.TEASER_SENT, DealStage.INTERESTED, DealStage.NDA_SENT, DealStage.NDA_NEGOTIATING, DealStage.NDA_EXECUTED])
  const interested = everReachedStages([DealStage.INTERESTED, DealStage.NDA_SENT, DealStage.NDA_NEGOTIATING, DealStage.NDA_EXECUTED])
  const ndaExecuted = everReachedStages([DealStage.NDA_EXECUTED, DealStage.CIM_ACCESS, DealStage.LEVEL_2_ACCESS, DealStage.LEVEL_3_ACCESS])
  const ioiReceived = everReachedStages([DealStage.IOI_RECEIVED, DealStage.IOI_ACCEPTED])
  const loiReceived = everReachedStages([DealStage.LOI_RECEIVED, DealStage.LOI_SELECTED, DealStage.LOI_BACKUP])
  const closed = closedDeals

  const conversionRates = {
    teaserToInterested: teaserSent > 0 ? (interested / teaserSent) * 100 : 0,
    interestedToNda: interested > 0 ? (ndaExecuted / interested) * 100 : 0,
    ndaToIoi: ndaExecuted > 0 ? (ioiReceived / ndaExecuted) * 100 : 0,
    ioiToLoi: ioiReceived > 0 ? (loiReceived / ioiReceived) * 100 : 0,
    loiToClose: loiReceived > 0 ? (closed / loiReceived) * 100 : 0,
    overallClose: totalBuyers > 0 ? (closed / totalBuyers) * 100 : 0,
  }

  // Calculate timeline metrics
  const calculateAvgDays = (startDateField: 'createdAt', endDateField: 'ndaExecutedAt' | 'ioiReceivedAt' | 'loiReceivedAt' | 'closedAt'): number | null => {
    const relevantBuyers = buyers.filter(b => b[endDateField] !== null)
    if (relevantBuyers.length === 0) return null

    const totalDays = relevantBuyers.reduce((sum, b) => {
      const startDate = new Date(b[startDateField])
      const endDate = new Date(b[endDateField]!)
      const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)

    return Math.round(totalDays / relevantBuyers.length)
  }

  const timeline = {
    avgDaysToNda: calculateAvgDays('createdAt', 'ndaExecutedAt'),
    avgDaysToIoi: calculateAvgDays('createdAt', 'ioiReceivedAt'),
    avgDaysToLoi: calculateAvgDays('createdAt', 'loiReceivedAt'),
    avgDaysToClose: calculateAvgDays('createdAt', 'closedAt'),
  }

  // Calculate IOI/LOI values
  const buyersWithIoi = buyers.filter(b => b.ioiAmount !== null)
  const buyersWithLoi = buyers.filter(b => b.loiAmount !== null)

  const ioiValues = buyersWithIoi.map(b => Number(b.ioiAmount))
  const loiValues = buyersWithLoi.map(b => Number(b.loiAmount))

  const ioiLoiValues = {
    totalIoiValue: ioiValues.reduce((sum, v) => sum + v, 0),
    avgIoiValue: ioiValues.length > 0 ? ioiValues.reduce((sum, v) => sum + v, 0) / ioiValues.length : 0,
    totalLoiValue: loiValues.reduce((sum, v) => sum + v, 0),
    avgLoiValue: loiValues.length > 0 ? loiValues.reduce((sum, v) => sum + v, 0) / loiValues.length : 0,
    highestIoi: ioiValues.length > 0 ? Math.max(...ioiValues) : 0,
    highestLoi: loiValues.length > 0 ? Math.max(...loiValues) : 0,
  }

  return {
    totalBuyers,
    activeBuyers,
    terminatedBuyers,
    closedDeals,
    byStageGroup,
    byStage,
    byType,
    byTier,
    conversionRates,
    timeline,
    ioiLoiValues,
  }
}

/**
 * Get pipeline summary for quick overview
 */
export async function getPipelineSummary(companyId: string) {
  const buyers = await prisma.prospectiveBuyer.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      currentStage: true,
      buyerType: true,
      tier: true,
      ioiAmount: true,
      loiAmount: true,
      ioiDeadline: true,
      loiDeadline: true,
      stageUpdatedAt: true,
    },
  })

  // Group by pipeline stages
  const pipeline = {
    identification: buyers.filter(b =>
      (STAGE_GROUPS.IDENTIFICATION.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
    marketing: buyers.filter(b =>
      (STAGE_GROUPS.MARKETING.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
    nda: buyers.filter(b =>
      (STAGE_GROUPS.NDA.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
    diligence: buyers.filter(b =>
      (STAGE_GROUPS.DILIGENCE.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
    ioi: buyers.filter(b =>
      (STAGE_GROUPS.IOI.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
    loi: buyers.filter(b =>
      (STAGE_GROUPS.LOI.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
    close: buyers.filter(b =>
      (STAGE_GROUPS.CLOSE.stages as readonly DealStage[]).includes(b.currentStage)
    ).length,
  }

  // Find buyers with upcoming deadlines
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const upcomingDeadlines = buyers
    .filter(b => {
      const ioiDeadline = b.ioiDeadline ? new Date(b.ioiDeadline) : null
      const loiDeadline = b.loiDeadline ? new Date(b.loiDeadline) : null
      return (
        (ioiDeadline && ioiDeadline >= now && ioiDeadline <= sevenDaysFromNow) ||
        (loiDeadline && loiDeadline >= now && loiDeadline <= sevenDaysFromNow)
      )
    })
    .map(b => ({
      id: b.id,
      name: b.name,
      deadline: b.ioiDeadline || b.loiDeadline,
      type: b.ioiDeadline && new Date(b.ioiDeadline) <= sevenDaysFromNow ? 'IOI' : 'LOI',
    }))

  // Find stale buyers (no stage update in 14+ days)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const staleBuyers = buyers
    .filter(b =>
      ACTIVE_STAGES.includes(b.currentStage) &&
      new Date(b.stageUpdatedAt) < fourteenDaysAgo
    )
    .map(b => ({
      id: b.id,
      name: b.name,
      currentStage: b.currentStage,
      daysSinceUpdate: Math.floor((now.getTime() - new Date(b.stageUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)),
    }))

  return {
    pipeline,
    upcomingDeadlines,
    staleBuyers,
    totalActive: buyers.filter(b => ACTIVE_STAGES.includes(b.currentStage)).length,
  }
}
