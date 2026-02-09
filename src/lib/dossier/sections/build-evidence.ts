import { prisma } from '@/lib/prisma'
import type { EvidenceSection } from '../types'

export async function buildEvidenceSection(companyId: string): Promise<EvidenceSection> {
  const documents = await prisma.dataRoomDocument.findMany({
    where: { companyId },
    select: {
      id: true,
      documentName: true,
      status: true,
      category: true,
      nextUpdateDue: true,
      evidenceCategory: true,
    },
  })

  // Count by status
  const documentsByStatus: Record<string, number> = {}
  for (const doc of documents) {
    documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1
  }

  // Find category gaps — BRI categories without evidence documents
  const allBriCategories = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']
  const coveredCategories = new Set(
    documents
      .filter(d => d.evidenceCategory)
      .map(d => d.evidenceCategory!)
  )
  const categoryGaps = allBriCategories.filter(c => !coveredCategories.has(c))

  // Urgent documents (NEEDS_UPDATE or OVERDUE)
  const urgentDocuments = documents
    .filter(d => d.status === 'NEEDS_UPDATE' || d.status === 'OVERDUE')
    .slice(0, 10)
    .map(d => ({
      id: d.id,
      documentName: d.documentName,
      status: d.status,
      category: d.category,
      nextUpdateDue: d.nextUpdateDue?.toISOString() ?? null,
    }))

  return {
    totalDocuments: documents.length,
    documentsByStatus,
    categoryGaps,
    urgentDocuments,
  }
}
