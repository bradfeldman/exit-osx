import type { TransactionFlagType } from '@prisma/client'

export interface VendorProfile {
  vendorName: string
  totalSpend: number
  transactionCount: number
  avgTransaction: number
  maxTransaction: number
  accountNames: string[]
  memos: string[]
  dateRange: { first: Date; last: Date }
}

export interface TransactionSummary {
  id: string
  vendorName: string | null
  memo: string | null
  accountName: string | null
  amount: number
  txnDate: Date
  txnType: string
}

export interface RuleFlag {
  flagType: TransactionFlagType
  category: string
  description: string
  suggestedAmount: number
  personalPct: number | null
  confidence: number
  sourceRule: string
  vendorName: string | null
  vendorTxnCount: number | null
  vendorTotalSpend: number | null
  transactionId: string | null
}

export interface AnalysisResult {
  flags: RuleFlag[]
  vendorProfiles: Map<string, VendorProfile>
  totalTransactions: number
  totalExpenseAmount: number
}

export interface AIClassification {
  vendorName: string
  flagType: TransactionFlagType | null
  category: string
  description: string
  suggestedAmount: number
  personalPct: number | null
  confidence: number
  isNewFind: boolean
}

export interface AIAnalysisResult {
  classifications: AIClassification[]
  buyerNarrative: string
  totalIdentified: number
}
