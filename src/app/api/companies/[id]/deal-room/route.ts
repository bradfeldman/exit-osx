import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import {
  VISUAL_STAGES,
  EXIT_STAGES,
  getVisualStage,
  getStageLabel,
  calculateEngagementLevel,
} from '@/lib/deal-room/visual-stages'
import { calculateEvidenceScore } from '@/lib/evidence/score-calculator'
import { mapDataRoomCategoryToEvidence, mapBriCategoryToEvidence } from '@/lib/evidence/category-mapper'
import type { EvidenceCategory } from '@/lib/evidence/evidence-categories'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch company with org tier info
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: { select: { planTier: true } },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Calculate evidence score
    const documents = await prisma.dataRoomDocument.findMany({
      where: { companyId },
      include: { linkedTask: { select: { briCategory: true } } },
    })

    const countsByCategory: Record<EvidenceCategory, number> = {
      financial: 0, legal: 0, operational: 0, customers: 0, team: 0, ipTech: 0,
    }
    for (const doc of documents) {
      let cat: EvidenceCategory
      if (doc.evidenceCategory) {
        cat = doc.evidenceCategory as EvidenceCategory
      } else if (doc.linkedTask?.briCategory) {
        cat = mapBriCategoryToEvidence(doc.linkedTask.briCategory)
      } else {
        cat = mapDataRoomCategoryToEvidence(doc.category)
      }
      if (cat in countsByCategory) countsByCategory[cat]++
    }
    const evidenceResult = calculateEvidenceScore(countsByCategory)
    const evidenceScore = evidenceResult.totalPercentage

    const evidenceReady = evidenceScore >= 70
    const canActivate = evidenceReady
    const isActivated = !!company.dealRoomActivatedAt

    const activation = {
      evidenceReady,
      evidenceScore,
      isActivated,
      activatedAt: company.dealRoomActivatedAt?.toISOString() ?? null,
      canActivate,
    }

    // If not activated, return activation info only
    if (!isActivated) {
      return NextResponse.json({
        activation,
        deal: null,
        pipeline: null,
        offers: [],
        dataRoom: null,
        recentActivityCount: 0,
        contactsSummary: null,
      })
    }

    // Fetch active deal
    const deal = await prisma.deal.findFirst({
      where: { companyId, status: 'ACTIVE' },
      include: {
        buyers: {
          include: {
            canonicalCompany: { select: { name: true, companyType: true } },
            contacts: {
              where: { isPrimary: true },
              include: {
                canonicalPerson: {
                  select: { firstName: true, lastName: true, email: true, currentTitle: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!deal) {
      return NextResponse.json({
        activation,
        deal: null,
        pipeline: null,
        offers: [],
        dataRoom: null,
        recentActivityCount: 0,
        contactsSummary: null,
      })
    }

    // Build pipeline by visual stage
    const activeBuyers = deal.buyers.filter(b => !EXIT_STAGES.includes(b.currentStage))
    const exitedBuyers = deal.buyers.filter(b => EXIT_STAGES.includes(b.currentStage))

    // Get doc view counts for engagement per buyer (contacts' emails → view data)
    const allContactEmails = deal.buyers.flatMap(b =>
      b.contacts.map(c => c.canonicalPerson.email).filter(Boolean) as string[]
    )

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
      select: { id: true, stage: true },
    })

    const recentViewsByEmail: Map<string, number> = new Map()
    const lastActivityByEmail: Map<string, Date> = new Map()

    if (dataRoom && allContactEmails.length > 0) {
      const recentViews = await prisma.dataRoomActivity.groupBy({
        by: ['userEmail'],
        where: {
          dataRoomId: dataRoom.id,
          action: 'VIEWED_DOCUMENT',
          createdAt: { gte: sevenDaysAgo },
          userEmail: { in: allContactEmails },
        },
        _count: { id: true },
      })
      for (const rv of recentViews) {
        recentViewsByEmail.set(rv.userEmail, rv._count.id)
      }

      const lastActivities = await prisma.dataRoomActivity.groupBy({
        by: ['userEmail'],
        where: {
          dataRoomId: dataRoom.id,
          userEmail: { in: allContactEmails },
        },
        _max: { createdAt: true },
      })
      for (const la of lastActivities) {
        if (la._max.createdAt) {
          lastActivityByEmail.set(la.userEmail, la._max.createdAt)
        }
      }
    }

    // Build stages array
    const stages = VISUAL_STAGES.map(vs => {
      const stageBuyers = activeBuyers.filter(b => getVisualStage(b.currentStage) === vs.id)

      return {
        visualStage: vs.id,
        label: vs.label,
        buyerCount: stageBuyers.length,
        buyers: stageBuyers.map(b => {
          const primaryContact = b.contacts[0]
          const contactEmails = b.contacts
            .map(c => c.canonicalPerson.email)
            .filter(Boolean) as string[]

          const docViewsLast7Days = contactEmails.reduce(
            (sum, email) => sum + (recentViewsByEmail.get(email) ?? 0),
            0
          )

          const lastActivityDates = contactEmails
            .map(email => lastActivityByEmail.get(email))
            .filter(Boolean) as Date[]
          const lastActivity = lastActivityDates.length > 0
            ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
            : null
          const lastActivityDaysAgo = lastActivity
            ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
            : null

          const offerType = b.loiAmount ? 'LOI' as const : b.ioiAmount ? 'IOI' as const : null
          const offerDeadline = b.loiDeadline ?? b.ioiDeadline

          return {
            id: b.id,
            companyName: b.canonicalCompany.name,
            buyerType: b.canonicalCompany.companyType,
            tier: b.tier,
            currentStage: b.currentStage,
            stageUpdatedAt: b.stageUpdatedAt.toISOString(),
            stageLabel: getStageLabel(b.currentStage),
            primaryContact: primaryContact ? {
              name: `${primaryContact.canonicalPerson.firstName} ${primaryContact.canonicalPerson.lastName}`,
              email: primaryContact.canonicalPerson.email ?? '',
              title: primaryContact.canonicalPerson.currentTitle,
            } : null,
            ioiAmount: b.ioiAmount ? Number(b.ioiAmount) : null,
            loiAmount: b.loiAmount ? Number(b.loiAmount) : null,
            offerType,
            offerDeadline: offerDeadline?.toISOString() ?? null,
            exclusivityEnd: b.exclusivityEnd?.toISOString() ?? null,
            engagementLevel: calculateEngagementLevel(docViewsLast7Days, lastActivityDaysAgo),
            lastActivity: lastActivity?.toISOString() ?? null,
            docViewsLast7Days,
            internalNotes: b.internalNotes,
            tags: b.tags,
          }
        }),
      }
    })

    const exitedBuyersSummary = exitedBuyers.map(b => ({
      id: b.id,
      companyName: b.canonicalCompany.name,
      exitStage: b.currentStage,
      exitReason: b.exitReason,
      exitedAt: (b.exitedAt ?? b.stageUpdatedAt).toISOString(),
    }))

    // Build offers array
    const offers = deal.buyers
      .filter(b => b.ioiAmount || b.loiAmount)
      .map(b => {
        const contactEmails = b.contacts
          .map(c => c.canonicalPerson.email)
          .filter(Boolean) as string[]
        const docViewsTotal = contactEmails.reduce(
          (sum, email) => sum + (recentViewsByEmail.get(email) ?? 0),
          0
        )
        const lastActivityDates = contactEmails
          .map(email => lastActivityByEmail.get(email))
          .filter(Boolean) as Date[]
        const lastActive = lastActivityDates.length > 0
          ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
          : null
        const lastActivityDaysAgo = lastActive
          ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          buyerId: b.id,
          companyName: b.canonicalCompany.name,
          buyerType: b.canonicalCompany.companyType,
          offerType: (b.loiAmount ? 'LOI' : 'IOI') as 'IOI' | 'LOI',
          amount: Number(b.loiAmount ?? b.ioiAmount),
          deadline: (b.loiDeadline ?? b.ioiDeadline)?.toISOString() ?? null,
          exclusivityStart: b.exclusivityStart?.toISOString() ?? null,
          exclusivityEnd: b.exclusivityEnd?.toISOString() ?? null,
          engagementLevel: calculateEngagementLevel(docViewsTotal, lastActivityDaysAgo),
          docViewsTotal,
          lastActive: lastActive?.toISOString() ?? null,
          notes: b.internalNotes,
        }
      })

    // Data room summary
    const openQuestions = dataRoom
      ? await prisma.dataRoomQuestion.count({
          where: { dataRoomId: dataRoom.id, status: 'open' },
        })
      : 0

    const recentViewCount = dataRoom
      ? await prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            action: 'VIEWED_DOCUMENT',
            createdAt: { gte: sevenDaysAgo },
          },
        })
      : 0

    const recentDownloadCount = dataRoom
      ? await prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            action: 'DOWNLOADED_DOCUMENT',
            createdAt: { gte: sevenDaysAgo },
          },
        })
      : 0

    const activeBuyerAccessCount = dataRoom
      ? await prisma.dataRoomAccess.count({
          where: { dataRoomId: dataRoom.id },
        })
      : 0

    // Contacts summary
    const participantCounts = await prisma.dealParticipant.groupBy({
      by: ['side'],
      where: { dealId: deal.id, isActive: true },
      _count: true,
    })
    const contactsSummary = { total: 0, buyer: 0, seller: 0, neutral: 0 }
    for (const pc of participantCounts) {
      contactsSummary[pc.side.toLowerCase() as 'buyer' | 'seller' | 'neutral'] = pc._count
      contactsSummary.total += pc._count
    }

    // Recent activity count
    const recentActivityCount = await prisma.dealActivity2.count({
      where: {
        dealId: deal.id,
        performedAt: { gte: sevenDaysAgo },
      },
    })

    return NextResponse.json({
      activation,
      deal: {
        id: deal.id,
        codeName: deal.codeName,
        status: deal.status,
        startedAt: deal.startedAt.toISOString(),
        targetCloseDate: deal.targetCloseDate?.toISOString() ?? null,
      },
      pipeline: {
        totalBuyers: deal.buyers.length,
        activeBuyers: activeBuyers.length,
        exitedBuyers: exitedBuyers.length,
        offersReceived: offers.length,
        stages,
        exitedBuyersSummary,
      },
      offers,
      dataRoom: dataRoom ? {
        id: dataRoom.id,
        stage: dataRoom.stage,
        activeBuyerAccessCount,
        totalDocuments: documents.length,
        evidenceScore,
        openQuestions,
        recentViews: recentViewCount,
        recentDownloads: recentDownloadCount,
      } : null,
      recentActivityCount,
      contactsSummary,
    })
  } catch (error) {
    console.error('Error fetching deal room data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal room data' },
      { status: 500 }
    )
  }
}

/**
 * POST — Activate the Deal Room
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error
    const { auth } = result

    // Update company with activation timestamp
    await prisma.company.update({
      where: { id: companyId },
      data: { dealRoomActivatedAt: new Date() },
    })

    // Ensure a Deal exists
    let deal = await prisma.deal.findFirst({
      where: { companyId, status: 'ACTIVE' },
    })

    if (!deal) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      })
      deal = await prisma.deal.create({
        data: {
          companyId,
          codeName: `Project ${company?.name ?? 'Alpha'}`,
          status: 'ACTIVE',
          createdByUserId: auth.user.id,
        },
      })
    }

    // Ensure DataRoom exists
    let dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })
    if (!dataRoom) {
      dataRoom = await prisma.dataRoom.create({
        data: {
          companyId,
          name: 'Data Room',
          stage: 'PREPARATION',
        },
      })
    }

    return NextResponse.json({
      success: true,
      dealId: deal.id,
      dataRoomId: dataRoom.id,
    })
  } catch (error) {
    console.error('Error activating deal room:', error)
    return NextResponse.json(
      { error: 'Failed to activate deal room' },
      { status: 500 }
    )
  }
}
