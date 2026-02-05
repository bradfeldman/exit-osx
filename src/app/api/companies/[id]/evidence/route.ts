import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { EVIDENCE_CATEGORIES, type EvidenceCategory, EVIDENCE_CATEGORY_MAP } from '@/lib/evidence/evidence-categories'
import { EXPECTED_DOCUMENTS, getExpectedDocsByCategory, getScoringDocsByCategory } from '@/lib/evidence/expected-documents'
import { calculateEvidenceScore } from '@/lib/evidence/score-calculator'
import { mapDataRoomCategoryToEvidence, mapBriCategoryToEvidence } from '@/lib/evidence/category-mapper'

function resolveEvidenceCategory(
  doc: { evidenceCategory: string | null; linkedTaskId: string | null; category: string },
  linkedTaskBriCategory: string | null
): EvidenceCategory {
  if (doc.evidenceCategory) return doc.evidenceCategory as EvidenceCategory
  if (linkedTaskBriCategory) return mapBriCategoryToEvidence(linkedTaskBriCategory)
  return mapDataRoomCategoryToEvidence(doc.category)
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
      },
      orderBy: { createdAt: 'desc' },
    })

    // Resolve evidence category for each document using a Map
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

    // Build per-category response
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const categories = EVIDENCE_CATEGORIES.map(cat => {
      const catDocs = documents.filter(d => categoryMap.get(d.id) === cat.id)
      const expectedDocs = getExpectedDocsByCategory(cat.id)
      const scoringDocs = getScoringDocsByCategory(cat.id)

      // Determine which expected docs are fulfilled
      const fulfilledIds = new Set(
        catDocs
          .filter(d => d.expectedDocumentId)
          .map(d => d.expectedDocumentId!)
      )

      const uploadedDocuments = catDocs.map(doc => {
        const isStale = doc.nextUpdateDue ? doc.nextUpdateDue < now : false
        const daysSinceUpdate = doc.lastUpdatedAt
          ? Math.floor((now.getTime() - doc.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          id: doc.id,
          name: doc.documentName,
          uploadedAt: doc.createdAt.toISOString(),
          source: (doc.evidenceSource ?? (doc.linkedTask ? 'task' : 'direct')) as 'direct' | 'task' | 'integration',
          sourceLabel: doc.linkedTask ? `Task — ${doc.linkedTask.title}` : null,
          isStale,
          staleReason: isStale && daysSinceUpdate
            ? `Last updated ${daysSinceUpdate} days ago`
            : null,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          version: doc.version,
          matchedExpectedId: doc.expectedDocumentId,
        }
      })

      const missingDocuments = expectedDocs
        .filter(ed => !fulfilledIds.has(ed.id))
        .map(ed => ({
          id: ed.id,
          name: ed.name,
          buyerExplanation: ed.buyerExplanation,
          importance: ed.importance,
        }))

      const catScore = scoreResult.categories.find(c => c.category === cat.id)

      return {
        id: cat.id,
        label: cat.label,
        buyerImpact: cat.buyerImpact,
        weight: cat.weight,
        documentsUploaded: catDocs.length,
        documentsExpected: scoringDocs.length,
        percentage: catScore?.percentage ?? 0,
        dots: catScore?.dots ?? 0,
        uploadedDocuments,
        missingDocuments,
      }
    })

    // Top missing across all categories (required + expected, sorted by category weight * sort order)
    const allMissing = categories.flatMap(cat => {
      const catConfig = EVIDENCE_CATEGORY_MAP[cat.id as EvidenceCategory]
      return cat.missingDocuments
        .filter(d => d.importance !== 'helpful')
        .map(d => ({
          ...d,
          category: cat.id as EvidenceCategory,
          categoryLabel: cat.label,
          sortScore: catConfig.weight * (1 / (EXPECTED_DOCUMENTS.find(e => e.id === d.id)?.sortOrder ?? 10)),
        }))
    }).sort((a, b) => b.sortScore - a.sortScore)

    const topMissing = allMissing.slice(0, 4).map(({ sortScore, ...rest }) => rest)

    // Recently added (last 30 days)
    const recentlyAdded = documents
      .filter(d => d.createdAt >= thirtyDaysAgo)
      .slice(0, 8)
      .map(doc => ({
        id: doc.id,
        name: doc.documentName,
        category: categoryMap.get(doc.id)!,
        categoryLabel: EVIDENCE_CATEGORY_MAP[categoryMap.get(doc.id)!]?.label ?? categoryMap.get(doc.id)!,
        addedAt: doc.createdAt.toISOString(),
        source: (doc.evidenceSource ?? (doc.linkedTask ? 'task' : 'direct')) as 'direct' | 'task' | 'integration',
      }))

    // Last upload date
    const lastUpload = documents[0]?.createdAt?.toISOString() ?? null

    // Deal Room readiness (simplified check)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { createdAt: true },
    })
    const daysOnPlatform = company
      ? Math.floor((now.getTime() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return NextResponse.json({
      score: {
        percentage: scoreResult.totalPercentage,
        label: `${scoreResult.totalPercentage}% buyer-ready`,
        documentsUploaded: documents.length,
        documentsExpected: scoreResult.totalExpected,
        lastUploadAt: lastUpload,
      },
      categories,
      topMissing,
      totalMissing: allMissing.length,
      recentlyAdded,
      dealRoom: {
        eligible: true,
        scoreReady: scoreResult.totalPercentage >= 70,
        tenureReady: daysOnPlatform >= 90,
        canActivate: scoreResult.totalPercentage >= 70 && daysOnPlatform >= 90,
        isActivated: false,
        documentsToUnlock: scoreResult.totalPercentage < 70
          ? Math.max(1, Math.ceil((70 - scoreResult.totalPercentage) / 4))
          : null,
      },
    })
  } catch (error) {
    console.error('Error fetching evidence data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evidence data' },
      { status: 500 }
    )
  }
}
