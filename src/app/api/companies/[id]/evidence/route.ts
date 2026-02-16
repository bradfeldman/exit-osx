import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { EVIDENCE_CATEGORIES, type EvidenceCategory, EVIDENCE_CATEGORY_MAP } from '@/lib/evidence/evidence-categories'
import { EXPECTED_DOCUMENTS, getExpectedDocsByCategory, getScoringDocsByCategory, type RefreshCadence } from '@/lib/evidence/expected-documents'
import { calculateEvidenceScore } from '@/lib/evidence/score-calculator'
import { mapDataRoomCategoryToEvidence, mapBriCategoryToEvidence } from '@/lib/evidence/category-mapper'

type FreshnessState = 'fresh' | 'current' | 'due_soon' | 'overdue'

function resolveEvidenceCategory(
  doc: { evidenceCategory: string | null; linkedTaskId: string | null; category: string },
  linkedTaskBriCategory: string | null
): EvidenceCategory {
  if (doc.evidenceCategory) return doc.evidenceCategory as EvidenceCategory
  if (linkedTaskBriCategory) return mapBriCategoryToEvidence(linkedTaskBriCategory)
  return mapDataRoomCategoryToEvidence(doc.category)
}

function computeFreshnessState(
  uploadedAt: Date,
  nextUpdateDue: Date | null,
  refreshCadence: RefreshCadence
): FreshnessState {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Recently uploaded = fresh
  if (uploadedAt > sevenDaysAgo) return 'fresh'

  // ONE_TIME and AS_NEEDED never go stale
  if (refreshCadence === 'ONE_TIME' || refreshCadence === 'AS_NEEDED') return 'current'

  if (!nextUpdateDue) return 'current'

  if (nextUpdateDue < now) return 'overdue'
  if (nextUpdateDue < sevenDaysFromNow) return 'due_soon'
  return 'current'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    // Fetch all documents for this company
    const documents = await prisma.dataRoomDocument.findMany({
      where: {
        companyId,
      },
      include: {
        linkedTask: {
          select: { id: true, title: true, briCategory: true },
        },
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Resolve evidence category for each document
    const categoryMap = new Map<string, EvidenceCategory>()
    for (const doc of documents) {
      categoryMap.set(
        doc.id,
        resolveEvidenceCategory(doc, doc.linkedTask?.briCategory ?? null)
      )
    }

    // Count documents per evidence category
    const countsByCategory: Record<EvidenceCategory, number> = {
      financial: 0, legal: 0, operational: 0, customers: 0, team: 0, ipTech: 0,
    }
    for (const doc of documents) {
      const cat = categoryMap.get(doc.id)!
      if (cat in countsByCategory) {
        countsByCategory[cat]++
      }
    }

    // Calculate score
    const scoreResult = calculateEvidenceScore(countsByCategory)

    const now = new Date()
    let staleCount = 0
    let dueSoonCount = 0
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Count stale/due-soon docs
    for (const doc of documents) {
      if (doc.nextUpdateDue) {
        if (doc.nextUpdateDue < now) staleCount++
        else if (doc.nextUpdateDue < sevenDaysFromNow) dueSoonCount++
      }
    }

    // Build per-category response with documentSlots
    const categories = EVIDENCE_CATEGORIES.map(cat => {
      const catDocs = documents.filter(d => categoryMap.get(d.id) === cat.id)
      const expectedDocs = getExpectedDocsByCategory(cat.id)
      const scoringDocs = getScoringDocsByCategory(cat.id)

      // Map expected document ID -> uploaded document
      const docsByExpectedId = new Map<string, typeof documents[number]>()
      for (const doc of catDocs) {
        if (doc.expectedDocumentId) {
          docsByExpectedId.set(doc.expectedDocumentId, doc)
        }
      }

      // Build document slots - one per expected document
      const documentSlots = expectedDocs.map(ed => {
        const uploadedDoc = docsByExpectedId.get(ed.id)

        let document = null
        if (uploadedDoc) {
          const freshnessState = computeFreshnessState(
            uploadedDoc.createdAt,
            uploadedDoc.nextUpdateDue,
            ed.refreshCadence,
          )

          document = {
            id: uploadedDoc.id,
            fileName: uploadedDoc.fileName ?? uploadedDoc.documentName,
            fileSize: uploadedDoc.fileSize,
            mimeType: uploadedDoc.mimeType,
            uploadedAt: uploadedDoc.createdAt.toISOString(),
            uploadedByName: uploadedDoc.uploadedBy?.fullName ?? uploadedDoc.uploadedBy?.email ?? null,
            source: (uploadedDoc.evidenceSource ?? (uploadedDoc.linkedTask ? 'task' : 'direct')) as 'direct' | 'task' | 'integration',
            sourceLabel: uploadedDoc.linkedTask ? `Task \u2014 ${uploadedDoc.linkedTask.title}` : null,
            freshnessState,
            nextUpdateDue: uploadedDoc.nextUpdateDue?.toISOString() ?? null,
            version: uploadedDoc.version,
            hasPreviousVersions: (uploadedDoc.version ?? 1) > 1,
          }
        }

        return {
          expectedDocId: ed.id,
          slotName: ed.name,
          importance: ed.importance,
          buyerExplanation: ed.buyerExplanation,
          sortOrder: ed.sortOrder,
          refreshCadence: ed.refreshCadence,
          isFilled: !!uploadedDoc,
          document,
          pendingRequest: null,
          linkedActionItem: null,
        }
      })

      // Custom documents (uploaded but not matching any expected document)
      const matchedIds = new Set(expectedDocs.map(ed => ed.id))
      const customDocs = catDocs.filter(d => !d.expectedDocumentId || !matchedIds.has(d.expectedDocumentId))
      const customSlots = customDocs.map((doc, i) => {
        const freshnessState = computeFreshnessState(doc.createdAt, doc.nextUpdateDue, 'AS_NEEDED')
        return {
          expectedDocId: `custom-${doc.id}`,
          slotName: doc.documentName,
          importance: 'custom' as const,
          buyerExplanation: '',
          sortOrder: 100 + i,
          refreshCadence: 'AS_NEEDED' as RefreshCadence,
          isFilled: true,
          document: {
            id: doc.id,
            fileName: doc.fileName ?? doc.documentName,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            uploadedAt: doc.createdAt.toISOString(),
            uploadedByName: doc.uploadedBy?.fullName ?? doc.uploadedBy?.email ?? null,
            source: (doc.evidenceSource ?? 'direct') as 'direct' | 'task' | 'integration',
            sourceLabel: doc.linkedTask ? `Task \u2014 ${doc.linkedTask.title}` : null,
            freshnessState,
            nextUpdateDue: doc.nextUpdateDue?.toISOString() ?? null,
            version: doc.version,
            hasPreviousVersions: (doc.version ?? 1) > 1,
          },
          pendingRequest: null,
          linkedActionItem: null,
        }
      })

      const catScore = scoreResult.categories.find(c => c.category === cat.id)

      return {
        id: cat.id,
        label: cat.label,
        buyerImpact: cat.buyerImpact,
        weight: cat.weight,
        documentsUploaded: catDocs.length,
        documentsExpected: scoringDocs.length,
        percentage: catScore?.percentage ?? 0,
        documentSlots: [...documentSlots, ...customSlots],
      }
    })

    // Last upload date
    const lastUpload = documents[0]?.createdAt?.toISOString() ?? null

    return NextResponse.json({
      score: {
        percentage: scoreResult.totalPercentage,
        label: `${scoreResult.totalPercentage}% buyer-ready`,
        documentsUploaded: documents.length,
        documentsExpected: scoreResult.totalExpected,
        lastUploadAt: lastUpload,
        staleCount,
        dueSoonCount,
      },
      categories,
      dealRoom: {
        eligible: true,
        scoreReady: scoreResult.totalPercentage >= 70,
        canActivate: scoreResult.totalPercentage >= 70,
        isActivated: false,
        documentsToUnlock: scoreResult.totalPercentage < 70
          ? Math.max(1, Math.ceil((70 - scoreResult.totalPercentage) / 4))
          : null,
      },
    })
  } catch (error) {
    console.error('Error fetching evidence data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch evidence data' },
      { status: 500 }
    )
  }
}
