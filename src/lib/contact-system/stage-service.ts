/**
 * Stage Transition Service
 *
 * Handles deal buyer stage transitions with validation,
 * side effects, and VDR access synchronization.
 */

import { prisma } from '@/lib/prisma'
import { DealStage, ActivityType } from '@prisma/client'
import { STAGE_TO_VDR_ACCESS } from './constants'

// ============================================
// STAGE TRANSITION RULES
// ============================================

/**
 * Valid stage transitions - defines what stages can move to what.
 * Imported from deal-tracker constants for consistency.
 */
export const VALID_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.IDENTIFIED]: [DealStage.SELLER_REVIEWING, DealStage.WITHDRAWN],
  [DealStage.SELLER_REVIEWING]: [DealStage.APPROVED, DealStage.DECLINED],
  [DealStage.APPROVED]: [DealStage.TEASER_SENT, DealStage.WITHDRAWN],
  [DealStage.DECLINED]: [], // Terminal
  [DealStage.TEASER_SENT]: [DealStage.INTERESTED, DealStage.PASSED, DealStage.WITHDRAWN],
  [DealStage.INTERESTED]: [DealStage.NDA_SENT, DealStage.WITHDRAWN],
  [DealStage.PASSED]: [], // Terminal
  [DealStage.NDA_SENT]: [DealStage.NDA_NEGOTIATING, DealStage.NDA_EXECUTED, DealStage.WITHDRAWN],
  [DealStage.NDA_NEGOTIATING]: [DealStage.NDA_EXECUTED, DealStage.WITHDRAWN],
  [DealStage.NDA_EXECUTED]: [DealStage.CIM_ACCESS, DealStage.WITHDRAWN],
  [DealStage.CIM_ACCESS]: [DealStage.LEVEL_2_ACCESS, DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.LEVEL_2_ACCESS]: [DealStage.LEVEL_3_ACCESS, DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.LEVEL_3_ACCESS]: [DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: [DealStage.MANAGEMENT_MEETING_COMPLETED, DealStage.WITHDRAWN],
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: [DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.IOI_REQUESTED]: [DealStage.IOI_RECEIVED, DealStage.WITHDRAWN],
  [DealStage.IOI_RECEIVED]: [DealStage.IOI_ACCEPTED, DealStage.IOI_DECLINED],
  [DealStage.IOI_ACCEPTED]: [DealStage.LOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.IOI_DECLINED]: [], // Terminal
  [DealStage.LOI_REQUESTED]: [DealStage.LOI_RECEIVED, DealStage.WITHDRAWN],
  [DealStage.LOI_RECEIVED]: [DealStage.LOI_SELECTED, DealStage.LOI_BACKUP, DealStage.WITHDRAWN],
  [DealStage.LOI_SELECTED]: [DealStage.DUE_DILIGENCE, DealStage.WITHDRAWN],
  [DealStage.LOI_BACKUP]: [DealStage.LOI_SELECTED, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.DUE_DILIGENCE]: [DealStage.PA_DRAFTING, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.PA_DRAFTING]: [DealStage.PA_NEGOTIATING, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.PA_NEGOTIATING]: [DealStage.CLOSING, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.CLOSING]: [DealStage.CLOSED, DealStage.TERMINATED],
  [DealStage.CLOSED]: [], // Terminal
  [DealStage.WITHDRAWN]: [], // Terminal
  [DealStage.TERMINATED]: [], // Terminal
}

/**
 * Terminal stages - no further transitions allowed
 */
export const TERMINAL_STAGES: DealStage[] = [
  DealStage.DECLINED,
  DealStage.PASSED,
  DealStage.IOI_DECLINED,
  DealStage.CLOSED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
]

/**
 * Exit stages - buyer has left the process
 */
export const EXIT_STAGES: DealStage[] = [
  DealStage.DECLINED,
  DealStage.PASSED,
  DealStage.IOI_DECLINED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
]

/**
 * Stage labels for display
 */
export const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.IDENTIFIED]: 'Identified',
  [DealStage.SELLER_REVIEWING]: 'Seller Reviewing',
  [DealStage.APPROVED]: 'Approved',
  [DealStage.DECLINED]: 'Declined',
  [DealStage.TEASER_SENT]: 'Teaser Sent',
  [DealStage.INTERESTED]: 'Interested',
  [DealStage.PASSED]: 'Passed',
  [DealStage.NDA_SENT]: 'NDA Sent',
  [DealStage.NDA_NEGOTIATING]: 'NDA Negotiating',
  [DealStage.NDA_EXECUTED]: 'NDA Executed',
  [DealStage.CIM_ACCESS]: 'CIM Access',
  [DealStage.LEVEL_2_ACCESS]: 'Level 2 Access',
  [DealStage.LEVEL_3_ACCESS]: 'Level 3 Access',
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: 'Mgmt Meeting Scheduled',
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: 'Mgmt Meeting Completed',
  [DealStage.IOI_REQUESTED]: 'IOI Requested',
  [DealStage.IOI_RECEIVED]: 'IOI Received',
  [DealStage.IOI_ACCEPTED]: 'IOI Accepted',
  [DealStage.IOI_DECLINED]: 'IOI Declined',
  [DealStage.LOI_REQUESTED]: 'LOI Requested',
  [DealStage.LOI_RECEIVED]: 'LOI Received',
  [DealStage.LOI_SELECTED]: 'LOI Selected',
  [DealStage.LOI_BACKUP]: 'LOI Backup',
  [DealStage.DUE_DILIGENCE]: 'Due Diligence',
  [DealStage.PA_DRAFTING]: 'PA Drafting',
  [DealStage.PA_NEGOTIATING]: 'PA Negotiating',
  [DealStage.CLOSING]: 'Closing',
  [DealStage.CLOSED]: 'Closed',
  [DealStage.WITHDRAWN]: 'Withdrawn',
  [DealStage.TERMINATED]: 'Terminated',
}

// ============================================
// TYPES
// ============================================

export interface StageTransitionInput {
  dealBuyerId: string
  toStage: DealStage
  note?: string
  skipValidation?: boolean
  ioiAmount?: number
  loiAmount?: number
  performedByUserId: string
}

export interface StageTransitionResult {
  success: boolean
  fromStage: DealStage
  toStage: DealStage
  error?: string
  vdrAccessUpdated: boolean
  activityLogId: string
}

// ============================================
// VALIDATION
// ============================================

/**
 * Check if a stage transition is valid
 */
export function isValidTransition(fromStage: DealStage, toStage: DealStage): boolean {
  return VALID_STAGE_TRANSITIONS[fromStage]?.includes(toStage) ?? false
}

/**
 * Get all valid next stages from a given stage
 */
export function getValidNextStages(fromStage: DealStage): DealStage[] {
  return VALID_STAGE_TRANSITIONS[fromStage] ?? []
}

/**
 * Check if a stage is terminal (no further transitions)
 */
export function isTerminalStage(stage: DealStage): boolean {
  return TERMINAL_STAGES.includes(stage)
}

/**
 * Check if a stage is an exit stage (buyer left the process)
 */
export function isExitStage(stage: DealStage): boolean {
  return EXIT_STAGES.includes(stage)
}

// ============================================
// STAGE TRANSITION SERVICE
// ============================================

/**
 * Transition a deal buyer to a new stage.
 * Handles validation, date updates, activity logging, and VDR sync.
 */
export async function transitionStage(
  input: StageTransitionInput
): Promise<StageTransitionResult> {
  const {
    dealBuyerId,
    toStage,
    note,
    skipValidation = false,
    ioiAmount,
    loiAmount,
    performedByUserId,
  } = input

  // Get current buyer state
  const buyer = await prisma.dealBuyer.findUnique({
    where: { id: dealBuyerId },
    include: {
      deal: true,
      contacts: {
        where: { isActive: true },
        include: { dataRoomAccess: true },
      },
    },
  })

  if (!buyer) {
    return {
      success: false,
      fromStage: DealStage.IDENTIFIED,
      toStage,
      error: 'Deal buyer not found',
      vdrAccessUpdated: false,
      activityLogId: '',
    }
  }

  const fromStage = buyer.currentStage

  // Validate transition
  if (!skipValidation && !isValidTransition(fromStage, toStage)) {
    return {
      success: false,
      fromStage,
      toStage,
      error: `Invalid stage transition from ${STAGE_LABELS[fromStage]} to ${STAGE_LABELS[toStage]}`,
      vdrAccessUpdated: false,
      activityLogId: '',
    }
  }

  // Build update data with milestone dates
  const updateData: Record<string, unknown> = {
    currentStage: toStage,
    stageUpdatedAt: new Date(),
  }

  // Set milestone dates based on stage
  switch (toStage) {
    case DealStage.TEASER_SENT:
      updateData.teaserSentAt = new Date()
      break
    case DealStage.NDA_EXECUTED:
      updateData.ndaExecutedAt = new Date()
      break
    case DealStage.CIM_ACCESS:
      updateData.cimAccessAt = new Date()
      break
    case DealStage.IOI_RECEIVED:
      updateData.ioiReceivedAt = new Date()
      if (ioiAmount !== undefined) updateData.ioiAmount = ioiAmount
      break
    case DealStage.LOI_RECEIVED:
      updateData.loiReceivedAt = new Date()
      if (loiAmount !== undefined) updateData.loiAmount = loiAmount
      break
    case DealStage.CLOSED:
      updateData.closedAt = new Date()
      break
    case DealStage.WITHDRAWN:
    case DealStage.TERMINATED:
    case DealStage.DECLINED:
    case DealStage.PASSED:
    case DealStage.IOI_DECLINED:
      updateData.exitedAt = new Date()
      updateData.exitReason = note || `Moved to ${STAGE_LABELS[toStage]}`
      break
  }

  // Perform updates in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update buyer
    await tx.dealBuyer.update({
      where: { id: dealBuyerId },
      data: updateData,
    })

    // Create stage history record
    await tx.dealStageHistory2.create({
      data: {
        dealBuyerId,
        fromStage,
        toStage,
        note,
        changedByUserId: performedByUserId,
      },
    })

    // Create activity log
    const activity = await tx.dealActivity2.create({
      data: {
        dealId: buyer.dealId,
        dealBuyerId,
        activityType: ActivityType.STAGE_CHANGED,
        subject: `Stage changed to ${STAGE_LABELS[toStage]}`,
        description: note,
        metadata: {
          fromStage,
          toStage,
          ioiAmount,
          loiAmount,
        },
        performedByUserId,
      },
    })

    return { activityLogId: activity.id }
  })

  // Sync VDR access (outside transaction for performance)
  let vdrAccessUpdated = false
  try {
    vdrAccessUpdated = await syncVDRAccessForBuyer(dealBuyerId, toStage, performedByUserId)
  } catch (error) {
    console.error('Failed to sync VDR access:', error)
  }

  return {
    success: true,
    fromStage,
    toStage,
    vdrAccessUpdated,
    activityLogId: result.activityLogId,
  }
}

// ============================================
// VDR ACCESS SYNC
// ============================================

/**
 * Sync VDR access for all contacts of a buyer based on their current stage.
 */
export async function syncVDRAccessForBuyer(
  dealBuyerId: string,
  stage: DealStage,
  performedByUserId: string
): Promise<boolean> {
  // Get the expected VDR access level for this stage
  const stageKey = stage as keyof typeof STAGE_TO_VDR_ACCESS
  const expectedAccessLevel = STAGE_TO_VDR_ACCESS[stageKey]
  if (!expectedAccessLevel || expectedAccessLevel === 'NONE') {
    return false
  }

  // Get buyer with contacts and deal info
  const buyer = await prisma.dealBuyer.findUnique({
    where: { id: dealBuyerId },
    include: {
      deal: {
        include: {
          company: {
            include: {
              dataRoom: true,
            },
          },
        },
      },
      contacts: {
        where: { isActive: true },
        include: {
          canonicalPerson: true,
          dataRoomAccess: true,
        },
      },
    },
  })

  if (!buyer || !buyer.deal.company.dataRoom) {
    return false
  }

  const dataRoomId = buyer.deal.company.dataRoom.id
  let accessUpdated = false

  // Update VDR access for each contact
  for (const contact of buyer.contacts) {
    if (!contact.canonicalPerson.email) continue

    // Determine the max stage based on access level
    const maxStage = getMaxStageForAccessLevel(expectedAccessLevel)

    if (contact.dataRoomAccessId) {
      // Update existing access
      await prisma.dataRoomAccess.update({
        where: { id: contact.dataRoomAccessId },
        data: { maxStage },
      })
      accessUpdated = true
    } else {
      // Create new access
      const access = await prisma.dataRoomAccess.create({
        data: {
          dataRoomId,
          email: contact.canonicalPerson.email,
          accessLevel: 'VIEWER',
          maxStage,
          invitedById: performedByUserId,
        },
      })

      // Link to deal contact
      await prisma.dealContact.update({
        where: { id: contact.id },
        data: {
          dataRoomAccessId: access.id,
          vdrAccessLevel: expectedAccessLevel as 'NONE' | 'TEASER' | 'POST_NDA' | 'LEVEL_2' | 'LEVEL_3' | 'FULL',
          vdrAccessGrantedAt: new Date(),
        },
      })
      accessUpdated = true
    }
  }

  // Log VDR access activity
  if (accessUpdated) {
    await prisma.dealActivity2.create({
      data: {
        dealId: buyer.dealId,
        dealBuyerId,
        activityType: ActivityType.VDR_ACCESS_GRANTED,
        subject: `VDR access updated to ${expectedAccessLevel}`,
        performedByUserId,
      },
    })
  }

  return accessUpdated
}

/**
 * Map VDR access level to DataRoom max stage.
 * DataRoomStage enum: PREPARATION, TEASER, POST_NDA, DUE_DILIGENCE, CLOSED
 */
function getMaxStageForAccessLevel(accessLevel: string): 'PREPARATION' | 'TEASER' | 'POST_NDA' | 'DUE_DILIGENCE' | 'CLOSED' {
  switch (accessLevel) {
    case 'TEASER':
      return 'TEASER'
    case 'POST_NDA':
      return 'POST_NDA'
    case 'LEVEL_2':
    case 'LEVEL_3':
      return 'DUE_DILIGENCE'
    case 'FULL':
      return 'CLOSED'
    default:
      return 'TEASER'
  }
}

/**
 * Revoke VDR access for a buyer's contacts (used on exit stages)
 */
export async function revokeVDRAccessForBuyer(
  dealBuyerId: string,
  performedByUserId: string
): Promise<boolean> {
  const buyer = await prisma.dealBuyer.findUnique({
    where: { id: dealBuyerId },
    include: {
      contacts: {
        include: { dataRoomAccess: true },
      },
    },
  })

  if (!buyer) return false

  for (const contact of buyer.contacts) {
    if (contact.dataRoomAccessId) {
      // Soft revoke - set access level to minimum
      await prisma.dataRoomAccess.update({
        where: { id: contact.dataRoomAccessId },
        data: {
          maxStage: 'TEASER',
          expiresAt: new Date(), // Expire immediately
        },
      })

      await prisma.dealContact.update({
        where: { id: contact.id },
        data: {
          vdrAccessLevel: 'NONE',
        },
      })
    }
  }

  // Log revocation
  await prisma.dealActivity2.create({
    data: {
      dealId: buyer.dealId,
      dealBuyerId,
      activityType: ActivityType.VDR_ACCESS_REVOKED,
      subject: 'VDR access revoked',
      performedByUserId,
    },
  })

  return true
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Transition multiple buyers to a new stage
 */
export async function bulkTransitionStage(
  dealBuyerIds: string[],
  toStage: DealStage,
  note: string | undefined,
  performedByUserId: string
): Promise<{
  successful: string[]
  failed: Array<{ id: string; error: string }>
}> {
  const successful: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of dealBuyerIds) {
    const result = await transitionStage({
      dealBuyerId: id,
      toStage,
      note,
      performedByUserId,
    })

    if (result.success) {
      successful.push(id)
    } else {
      failed.push({ id, error: result.error || 'Unknown error' })
    }
  }

  return { successful, failed }
}

// ============================================
// STAGE ANALYTICS
// ============================================

/**
 * Get stage transition history for a buyer
 */
export async function getStageHistory(dealBuyerId: string) {
  return prisma.dealStageHistory2.findMany({
    where: { dealBuyerId },
    orderBy: { changedAt: 'desc' },
  })
}

/**
 * Calculate time spent in each stage for a buyer
 */
export async function getTimeInStages(dealBuyerId: string): Promise<
  Array<{
    stage: DealStage
    enteredAt: Date
    exitedAt: Date | null
    durationDays: number | null
  }>
> {
  const history = await prisma.dealStageHistory2.findMany({
    where: { dealBuyerId },
    orderBy: { changedAt: 'asc' },
  })

  const result: Array<{
    stage: DealStage
    enteredAt: Date
    exitedAt: Date | null
    durationDays: number | null
  }> = []

  for (let i = 0; i < history.length; i++) {
    const entry = history[i]
    const nextEntry = history[i + 1]

    result.push({
      stage: entry.toStage,
      enteredAt: entry.changedAt,
      exitedAt: nextEntry?.changedAt || null,
      durationDays: nextEntry
        ? Math.round((nextEntry.changedAt.getTime() - entry.changedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })
  }

  return result
}
