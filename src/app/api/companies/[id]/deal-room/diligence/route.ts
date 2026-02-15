import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { EVIDENCE_CATEGORY_MAP, type EvidenceCategory } from '@/lib/evidence/evidence-categories'
import { getExpectedDocsByCategory, getScoringDocsByCategory } from '@/lib/evidence/expected-documents'
import { calculateEvidenceScore } from '@/lib/evidence/score-calculator'
import { mapDataRoomCategoryToEvidence, mapBriCategoryToEvidence } from '@/lib/evidence/category-mapper'
import { DILIGENCE_SECTIONS } from '@/lib/evidence/diligence-sections'

function resolveEvidenceCategory(
  doc: { evidenceCategory: string | null; linkedTaskId: string | null; category: string },
  linkedTaskBriCategory: string | null
): EvidenceCategory {
  if (doc.evidenceCategory) return doc.evidenceCategory as EvidenceCategory
  if (linkedTaskBriCategory) return mapBriCategoryToEvidence(linkedTaskBriCategory)
  return mapDataRoomCategoryToEvidence(doc.category)
}

/**
 * GET /api/companies/[id]/deal-room/diligence
 *
 * Returns documents organized by buyer-facing diligence sections.
 * Supports a `buyerPreview` query param to return a sanitized view
 * (no internal notes, no stale reasons, no source labels).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const url = new URL(request.url)
    const isBuyerPreview = url.searchParams.get('buyerPreview') === 'true'

    // Fetch all documents
    const documents = await prisma.dataRoomDocument.findMany({
      where: { companyId },
      include: {
        linkedTask: {
          select: { id: true, title: true, briCategory: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()

    // Resolve evidence category for each document
    const categoryMap = new Map<string, EvidenceCategory>()
    for (const doc of documents) {
      categoryMap.set(
        doc.id,
        resolveEvidenceCategory(doc, doc.linkedTask?.briCategory ?? null)
      )
    }

    // Count documents per evidence category for scoring
    const countsByCategory: Record<EvidenceCategory, number> = {
      financial: 0, legal: 0, operational: 0, customers: 0, team: 0, ipTech: 0,
    }
    for (const doc of documents) {
      const cat = categoryMap.get(doc.id)!
      if (cat in countsByCategory) {
        countsByCategory[cat]++
      }
    }

    const scoreResult = calculateEvidenceScore(countsByCategory)

    // Build per-diligence-section response
    const sections = DILIGENCE_SECTIONS.map(section => {
      // Get all documents belonging to this section's evidence categories
      const sectionDocs = documents.filter(d => {
        const evCat = categoryMap.get(d.id)!
        return section.evidenceCategories.includes(evCat)
      })

      // Get expected documents for this section
      const expectedDocs = section.evidenceCategories.flatMap(cat =>
        getExpectedDocsByCategory(cat)
      )
      const scoringDocs = section.evidenceCategories.flatMap(cat =>
        getScoringDocsByCategory(cat)
      )

      // Determine which expected docs are fulfilled
      const fulfilledIds = new Set(
        sectionDocs
          .filter(d => d.expectedDocumentId)
          .map(d => d.expectedDocumentId!)
      )

      // Uploaded documents
      const uploadedDocuments = sectionDocs
        .filter(d => d.fileUrl || d.filePath)
        .map(doc => {
          const isStale = doc.nextUpdateDue ? doc.nextUpdateDue < now : false
          const daysSinceUpdate = doc.lastUpdatedAt
            ? Math.floor((now.getTime() - doc.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
            : null

          const base = {
            id: doc.id,
            name: doc.documentName,
            uploadedAt: doc.createdAt.toISOString(),
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            matchedExpectedId: doc.expectedDocumentId,
            evidenceCategory: categoryMap.get(doc.id)!,
            evidenceCategoryLabel: EVIDENCE_CATEGORY_MAP[categoryMap.get(doc.id)!]?.label ?? categoryMap.get(doc.id)!,
          }

          if (isBuyerPreview) {
            return base
          }

          return {
            ...base,
            source: (doc.evidenceSource ?? (doc.linkedTask ? 'task' : 'direct')) as 'direct' | 'task' | 'integration',
            sourceLabel: doc.linkedTask ? `Task: ${doc.linkedTask.title}` : null,
            isStale,
            staleReason: isStale && daysSinceUpdate
              ? `Last updated ${daysSinceUpdate} days ago`
              : null,
            version: doc.version,
          }
        })

      // Missing documents (not in buyer preview -- buyers don't see gaps)
      const missingDocuments = isBuyerPreview ? [] : expectedDocs
        .filter(ed => !fulfilledIds.has(ed.id))
        .map(ed => ({
          id: ed.id,
          name: ed.name,
          buyerExplanation: ed.buyerExplanation,
          importance: ed.importance,
          evidenceCategory: ed.category,
          evidenceCategoryLabel: EVIDENCE_CATEGORY_MAP[ed.category]?.label ?? ed.category,
        }))

      // Calculate section completeness
      const totalScoring = scoringDocs.length
      const fulfilledScoring = scoringDocs.filter(sd => fulfilledIds.has(sd.id)).length
      const completeness = totalScoring > 0
        ? Math.round((fulfilledScoring / totalScoring) * 100)
        : (uploadedDocuments.length > 0 ? 100 : 0)

      return {
        id: section.id,
        label: section.label,
        description: section.description,
        sortOrder: section.sortOrder,
        evidenceCategories: section.evidenceCategories,
        completeness,
        documentsUploaded: uploadedDocuments.length,
        documentsExpected: totalScoring,
        uploadedDocuments,
        missingDocuments,
      }
    })

    // Overall completeness
    const totalExpected = sections.reduce((sum, s) => sum + s.documentsExpected, 0)
    const totalFulfilled = sections.reduce((sum, s) => {
      const fulfilled = s.uploadedDocuments.filter(d => d.matchedExpectedId).length
      return sum + Math.min(fulfilled, s.documentsExpected)
    }, 0)
    const overallCompleteness = totalExpected > 0
      ? Math.round((totalFulfilled / totalExpected) * 100)
      : 0

    return NextResponse.json({
      isBuyerPreview,
      overallCompleteness,
      evidenceScore: scoreResult.totalPercentage,
      totalDocuments: documents.filter(d => d.fileUrl || d.filePath).length,
      totalExpected,
      sections,
    })
  } catch (error) {
    console.error('Error fetching diligence data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch diligence data' },
      { status: 500 }
    )
  }
}
