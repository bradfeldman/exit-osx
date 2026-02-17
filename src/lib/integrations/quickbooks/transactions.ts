import { makeQuickBooksRequest } from './api'
import { prisma } from '@/lib/prisma'

// QB entity types we fetch for expense transactions
const ENTITY_TYPES = ['Purchase', 'Bill', 'JournalEntry', 'VendorCredit'] as const

interface QBLine {
  Amount?: number
  Description?: string
  AccountBasedExpenseLineDetail?: {
    AccountRef?: { name?: string; value?: string }
  }
  ItemBasedExpenseLineDetail?: {
    ItemRef?: { name?: string }
  }
  JournalEntryLineDetail?: {
    AccountRef?: { name?: string; value?: string }
    PostingType?: string
  }
  DetailType?: string
}

interface QBEntity {
  Id: string
  TxnDate: string
  DocNumber?: string
  Line?: QBLine[]
  EntityRef?: { name?: string }
  VendorRef?: { name?: string }
  PrivateNote?: string
  Memo?: string
  TotalAmt?: number
}

interface QBQueryResponse {
  QueryResponse: {
    Purchase?: QBEntity[]
    Bill?: QBEntity[]
    JournalEntry?: QBEntity[]
    VendorCredit?: QBEntity[]
    startPosition?: number
    maxResults?: number
    totalCount?: number
  }
}

interface NormalizedTransaction {
  qbId: string
  txnDate: Date
  txnType: string
  docNumber: string | null
  vendorName: string | null
  memo: string | null
  accountName: string | null
  amount: number
  qbAccountType: string | null
  rawData: null
}

function normalizeEntityLines(
  entity: QBEntity,
  entityType: string
): NormalizedTransaction[] {
  const lines: NormalizedTransaction[] = []
  const vendorName = entity.VendorRef?.name || entity.EntityRef?.name || null
  const memo = entity.PrivateNote || entity.Memo || null

  if (!entity.Line || entity.Line.length === 0) {
    // Single-line entity (no line items)
    if (entity.TotalAmt && entity.TotalAmt > 0) {
      lines.push({
        qbId: `${entity.Id}-${entityType}`,
        txnDate: new Date(entity.TxnDate),
        txnType: entityType,
        docNumber: entity.DocNumber || null,
        vendorName,
        memo,
        accountName: null,
        amount: entity.TotalAmt,
        qbAccountType: null,
        rawData: null,
      })
    }
    return lines
  }

  entity.Line.forEach((line, index) => {
    const amount = line.Amount || 0
    if (amount <= 0) return

    // Skip sub-total lines
    if (line.DetailType === 'SubTotalLineDetail') return

    // For journal entries, only include debit lines (expenses)
    if (entityType === 'JournalEntry') {
      if (line.JournalEntryLineDetail?.PostingType !== 'Debit') return
    }

    const accountDetail =
      line.AccountBasedExpenseLineDetail?.AccountRef?.name ||
      line.JournalEntryLineDetail?.AccountRef?.name ||
      line.ItemBasedExpenseLineDetail?.ItemRef?.name ||
      null

    lines.push({
      qbId: `${entity.Id}-${entityType}-line-${index}`,
      txnDate: new Date(entity.TxnDate),
      txnType: entityType,
      docNumber: entity.DocNumber || null,
      vendorName,
      memo: line.Description || memo,
      accountName: accountDetail,
      amount,
      qbAccountType: null,
      rawData: null,
    })
  })

  return lines
}

async function fetchEntities(
  integrationId: string,
  entityType: string,
  startDate: string,
  endDate: string
): Promise<QBEntity[]> {
  const allEntities: QBEntity[] = []
  let startPosition = 1
  const maxResults = 1000

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = `SELECT * FROM ${entityType} WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
    const response = await makeQuickBooksRequest<QBQueryResponse>(
      integrationId,
      `/query?query=${encodeURIComponent(query)}`
    )

    const entities = response.QueryResponse[entityType as keyof QBQueryResponse['QueryResponse']] as QBEntity[] | undefined
    if (!entities || entities.length === 0) break

    allEntities.push(...entities)

    if (entities.length < maxResults) break
    startPosition += maxResults
  }

  return allEntities
}

export async function syncTransactions(
  integrationId: string,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<{ transactionCount: number }> {
  const allTransactions: NormalizedTransaction[] = []

  // Fetch all entity types
  for (const entityType of ENTITY_TYPES) {
    try {
      const entities = await fetchEntities(integrationId, entityType, startDate, endDate)
      for (const entity of entities) {
        const normalized = normalizeEntityLines(entity, entityType)
        allTransactions.push(...normalized)
      }
    } catch (error) {
      // Some QB companies may not have all entity types; skip on 400/404
      console.warn(`[Transaction Sync] Failed to fetch ${entityType}:`, error instanceof Error ? error.message : String(error))
    }
  }

  // Upsert in batches of 100
  const batchSize = 100
  for (let i = 0; i < allTransactions.length; i += batchSize) {
    const batch = allTransactions.slice(i, i + batchSize)
    await Promise.all(
      batch.map((txn) =>
        prisma.qBTransaction.upsert({
          where: {
            companyId_qbId_txnType: {
              companyId,
              qbId: txn.qbId,
              txnType: txn.txnType,
            },
          },
          create: {
            integrationId,
            companyId,
            qbId: txn.qbId,
            txnDate: txn.txnDate,
            txnType: txn.txnType,
            docNumber: txn.docNumber,
            vendorName: txn.vendorName,
            memo: txn.memo,
            accountName: txn.accountName,
            amount: txn.amount,
            qbAccountType: txn.qbAccountType,
            rawData: undefined,
          },
          update: {
            txnDate: txn.txnDate,
            docNumber: txn.docNumber,
            vendorName: txn.vendorName,
            memo: txn.memo,
            accountName: txn.accountName,
            amount: txn.amount,
            qbAccountType: txn.qbAccountType,
          },
        })
      )
    )
  }

  return { transactionCount: allTransactions.length }
}
