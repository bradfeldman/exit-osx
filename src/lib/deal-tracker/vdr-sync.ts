import { prisma } from '@/lib/prisma'
import { DealStage, DataRoomStage, DataRoomAccessLevel } from '@prisma/client'
import { ACTIVITY_TYPES } from './constants'

// VDR access configuration based on deal stage
interface VDRAccessConfig {
  shouldHaveAccess: boolean
  maxStage: DataRoomStage | null
  accessLevel: DataRoomAccessLevel | null
}

/**
 * Determines VDR access configuration based on deal stage
 */
export function getVDRAccessConfig(stage: DealStage): VDRAccessConfig {
  // No access for identification/declined stages
  const noAccessStages: DealStage[] = [
    DealStage.IDENTIFIED,
    DealStage.SELLER_REVIEWING,
    DealStage.APPROVED,
    DealStage.DECLINED,
    DealStage.PASSED,
    DealStage.WITHDRAWN,
    DealStage.TERMINATED,
    DealStage.IOI_DECLINED,
  ]

  if (noAccessStages.includes(stage)) {
    return {
      shouldHaveAccess: false,
      maxStage: null,
      accessLevel: null,
    }
  }

  // TEASER stage access - limited docs
  const teaserStages: DealStage[] = [
    DealStage.TEASER_SENT,
    DealStage.INTERESTED,
    DealStage.NDA_SENT,
    DealStage.NDA_NEGOTIATING,
  ]

  if (teaserStages.includes(stage)) {
    return {
      shouldHaveAccess: true,
      maxStage: DataRoomStage.TEASER,
      accessLevel: DataRoomAccessLevel.VIEWER,
    }
  }

  // POST_NDA stage access - CIM and more
  const postNdaStages: DealStage[] = [
    DealStage.NDA_EXECUTED,
    DealStage.CIM_ACCESS,
    DealStage.LEVEL_2_ACCESS,
    DealStage.MANAGEMENT_MEETING_SCHEDULED,
    DealStage.MANAGEMENT_MEETING_COMPLETED,
    DealStage.IOI_REQUESTED,
    DealStage.IOI_RECEIVED,
    DealStage.IOI_ACCEPTED,
  ]

  if (postNdaStages.includes(stage)) {
    return {
      shouldHaveAccess: true,
      maxStage: DataRoomStage.POST_NDA,
      accessLevel: DataRoomAccessLevel.DOWNLOADER,
    }
  }

  // DUE_DILIGENCE stage access - full DD docs
  const ddStages: DealStage[] = [
    DealStage.LEVEL_3_ACCESS,
    DealStage.LOI_REQUESTED,
    DealStage.LOI_RECEIVED,
    DealStage.LOI_SELECTED,
    DealStage.LOI_BACKUP,
    DealStage.DUE_DILIGENCE,
    DealStage.PA_DRAFTING,
    DealStage.PA_NEGOTIATING,
    DealStage.CLOSING,
  ]

  if (ddStages.includes(stage)) {
    return {
      shouldHaveAccess: true,
      maxStage: DataRoomStage.DUE_DILIGENCE,
      accessLevel: DataRoomAccessLevel.DOWNLOADER,
    }
  }

  // CLOSED stage - archive access
  if (stage === DealStage.CLOSED) {
    return {
      shouldHaveAccess: true,
      maxStage: DataRoomStage.CLOSED,
      accessLevel: DataRoomAccessLevel.VIEWER,
    }
  }

  // Default - no access
  return {
    shouldHaveAccess: false,
    maxStage: null,
    accessLevel: null,
  }
}

/**
 * Syncs VDR access for all contacts of a prospective buyer based on their deal stage
 */
export async function syncBuyerVDRAccess(
  buyerId: string,
  userId: string,
  _userEmail: string
): Promise<{ granted: number; revoked: number }> {
  // Get the buyer with their contacts and company
  const buyer = await prisma.prospectiveBuyer.findUnique({
    where: { id: buyerId },
    include: {
      contacts: true,
      company: {
        include: {
          dataRoom: true,
        },
      },
    },
  })

  if (!buyer) {
    throw new Error('Buyer not found')
  }

  const dataRoom = buyer.company.dataRoom

  if (!dataRoom) {
    // No data room exists - nothing to sync
    return { granted: 0, revoked: 0 }
  }

  const accessConfig = getVDRAccessConfig(buyer.currentStage)
  let granted = 0
  let revoked = 0

  for (const contact of buyer.contacts) {
    if (!contact.isActive) continue

    if (accessConfig.shouldHaveAccess && accessConfig.maxStage && accessConfig.accessLevel) {
      // Should have access - grant or update
      let accessGrant = await prisma.dataRoomAccess.findUnique({
        where: {
          dataRoomId_email: {
            dataRoomId: dataRoom.id,
            email: contact.email.toLowerCase(),
          },
        },
      })

      if (accessGrant) {
        // Update existing access
        accessGrant = await prisma.dataRoomAccess.update({
          where: { id: accessGrant.id },
          data: {
            maxStage: accessConfig.maxStage,
            accessLevel: accessConfig.accessLevel,
          },
        })
      } else {
        // Create new access
        accessGrant = await prisma.dataRoomAccess.create({
          data: {
            dataRoomId: dataRoom.id,
            email: contact.email.toLowerCase(),
            maxStage: accessConfig.maxStage,
            accessLevel: accessConfig.accessLevel,
            invitedById: userId,
          },
        })
        granted++

        // Log activity
        await prisma.dealActivity.create({
          data: {
            buyerId: buyer.id,
            activityType: ACTIVITY_TYPES.VDR_ACCESS_GRANTED,
            description: `VDR access granted to ${contact.firstName} ${contact.lastName}`,
            metadata: {
              contactId: contact.id,
              email: contact.email,
              maxStage: accessConfig.maxStage,
              accessLevel: accessConfig.accessLevel,
            },
            performedById: userId,
          },
        })
      }

      // Link contact to access grant
      if (contact.dataRoomAccessId !== accessGrant.id) {
        await prisma.buyerContact.update({
          where: { id: contact.id },
          data: { dataRoomAccessId: accessGrant.id },
        })
      }
    } else {
      // Should not have access - revoke if exists
      if (contact.dataRoomAccessId) {
        await prisma.dataRoomAccess.delete({
          where: { id: contact.dataRoomAccessId },
        }).catch(() => {
          // Access may already be deleted, ignore
        })

        await prisma.buyerContact.update({
          where: { id: contact.id },
          data: { dataRoomAccessId: null },
        })

        revoked++

        // Log activity
        await prisma.dealActivity.create({
          data: {
            buyerId: buyer.id,
            activityType: ACTIVITY_TYPES.VDR_ACCESS_REVOKED,
            description: `VDR access revoked from ${contact.firstName} ${contact.lastName}`,
            metadata: {
              contactId: contact.id,
              email: contact.email,
            },
            performedById: userId,
          },
        })
      }
    }
  }

  return { granted, revoked }
}

/**
 * Grants VDR access to a specific contact
 */
export async function grantContactVDRAccess(
  contactId: string,
  userId: string
): Promise<void> {
  const contact = await prisma.buyerContact.findUnique({
    where: { id: contactId },
    include: {
      buyer: {
        include: {
          company: {
            include: {
              dataRoom: true,
            },
          },
        },
      },
    },
  })

  if (!contact) {
    throw new Error('Contact not found')
  }

  const dataRoom = contact.buyer.company.dataRoom

  if (!dataRoom) {
    throw new Error('Data room not found')
  }

  const accessConfig = getVDRAccessConfig(contact.buyer.currentStage)

  if (!accessConfig.shouldHaveAccess || !accessConfig.maxStage || !accessConfig.accessLevel) {
    throw new Error('Contact\'s buyer stage does not qualify for VDR access')
  }

  // Check if access already exists
  let accessGrant = await prisma.dataRoomAccess.findUnique({
    where: {
      dataRoomId_email: {
        dataRoomId: dataRoom.id,
        email: contact.email.toLowerCase(),
      },
    },
  })

  if (!accessGrant) {
    accessGrant = await prisma.dataRoomAccess.create({
      data: {
        dataRoomId: dataRoom.id,
        email: contact.email.toLowerCase(),
        maxStage: accessConfig.maxStage,
        accessLevel: accessConfig.accessLevel,
        invitedById: userId,
      },
    })
  }

  // Link contact to access grant
  await prisma.buyerContact.update({
    where: { id: contact.id },
    data: { dataRoomAccessId: accessGrant.id },
  })
}

/**
 * Revokes VDR access from a specific contact
 */
export async function revokeContactVDRAccess(
  contactId: string,
  userId: string
): Promise<void> {
  const contact = await prisma.buyerContact.findUnique({
    where: { id: contactId },
    include: {
      buyer: true,
    },
  })

  if (!contact) {
    throw new Error('Contact not found')
  }

  if (contact.dataRoomAccessId) {
    await prisma.dataRoomAccess.delete({
      where: { id: contact.dataRoomAccessId },
    }).catch(() => {
      // Access may already be deleted
    })

    await prisma.buyerContact.update({
      where: { id: contact.id },
      data: { dataRoomAccessId: null },
    })

    // Log activity
    await prisma.dealActivity.create({
      data: {
        buyerId: contact.buyerId,
        activityType: ACTIVITY_TYPES.VDR_ACCESS_REVOKED,
        description: `VDR access revoked from ${contact.firstName} ${contact.lastName}`,
        metadata: {
          contactId: contact.id,
          email: contact.email,
        },
        performedById: userId,
      },
    })
  }
}
