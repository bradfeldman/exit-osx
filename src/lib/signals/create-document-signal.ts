/**
 * Document Upload Signal Creation
 *
 * When evidence is uploaded (via the evidence upload route), this creates
 * a TASK_GENERATED signal to track the event and flows it into the Value Ledger.
 *
 * Evidence uploads are a positive signal -- they indicate the company owner
 * is actively preparing for exit by building their evidence room.
 */

import { createSignalWithLedgerEntry } from './create-signal'
import { getDefaultConfidenceForChannel } from './confidence-scoring'
import type { BriCategory } from '@prisma/client'
import type { DocumentUploadData } from './types'

/** Map evidence categories to BRI categories for signal tagging */
const EVIDENCE_TO_BRI_CATEGORY: Record<string, BriCategory> = {
  financial: 'FINANCIAL',
  legal: 'LEGAL_TAX',
  operational: 'OPERATIONAL',
  customers: 'MARKET',
  team: 'TRANSFERABILITY',
  ipTech: 'OPERATIONAL',
}

interface CreateDocumentSignalInput {
  companyId: string
  documentId: string
  documentName: string
  evidenceCategory: string
  expectedDocumentId: string | null
  source: 'direct' | 'task' | 'integration'
  linkedTaskId: string | null
  mimeType: string | null
  fileSize: number | null
}

export async function createDocumentUploadSignal(input: CreateDocumentSignalInput) {
  const briCategory = EVIDENCE_TO_BRI_CATEGORY[input.evidenceCategory] ?? null

  const isExpected = !!input.expectedDocumentId
  const severity = isExpected ? 'LOW' : 'INFO'

  const rawData: DocumentUploadData = {
    documentId: input.documentId,
    documentName: input.documentName,
    evidenceCategory: input.evidenceCategory,
    expectedDocumentId: input.expectedDocumentId,
    source: input.source,
    linkedTaskId: input.linkedTaskId,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  }

  return createSignalWithLedgerEntry({
    companyId: input.companyId,
    channel: 'TASK_GENERATED',
    category: briCategory,
    eventType: 'document_uploaded',
    severity,
    confidence: getDefaultConfidenceForChannel('TASK_GENERATED'),
    title: `Evidence uploaded: ${input.documentName}`,
    description: isExpected
      ? `Expected document "${input.documentName}" uploaded to evidence room`
      : `New document "${input.documentName}" added to evidence room`,
    rawData: rawData as unknown as Record<string, unknown>,
    sourceType: 'document',
    sourceId: input.documentId,
    ledgerEventType: 'NEW_DATA_CONNECTED',
    narrativeSummary: `Evidence document "${input.documentName}" uploaded${input.source === 'task' ? ' via task completion' : ''} — improving buyer readiness`,
  })
}
