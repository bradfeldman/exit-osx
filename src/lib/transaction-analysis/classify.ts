import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai/anthropic'
import { TransactionFlagType } from '@prisma/client'
import type { VendorProfile, RuleFlag, AIClassification, AIAnalysisResult } from './types'

interface CompanyContext {
  companyName: string
  industry: string
  annualRevenue: number
  state?: string | null
}

interface AIVendorInput {
  vendorName: string
  totalSpend: number
  txnCount: number
  accounts: string[]
  sampleMemos: string[]
  ruleFlag?: string
  ruleConfidence?: number
}

interface AIResponseSchema {
  classifications: Array<{
    vendorName: string
    flagType: string | null
    category: string
    description: string
    suggestedAmount: number
    personalPct: number | null
    confidence: number
    isNewFind: boolean
  }>
  buyerNarrative: string
}

const SYSTEM_PROMPT = `You are a Quality of Earnings (QoE) analyst reviewing expense transactions from a small-to-midsize business. Your job is to identify EBITDA add-backs that would be defensible in a buyer's due diligence process.

EBITDA add-backs are expenses that should be "added back" because they are:
1. OWNER_PERSONAL - Owner personal expenses run through the business (vehicles, subscriptions, dining, travel, etc.)
2. ONE_TIME - Non-recurring charges that won't continue post-acquisition (lawsuits, settlements, one-time projects)
3. RELATED_PARTY - Above-market payments to related parties (family on payroll, owner-related entities)
4. TRANSACTION_COST - M&A-related fees (broker fees, legal costs for the sale, due diligence)
5. NORMALIZATION - Accounting adjustments (unusual depreciation, one-time tax items)
6. LOCATION_ANOMALY - Expenses from locations inconsistent with the business (vacation cities, etc.)

For each vendor you review, you must either:
- CONFIRM a rules-engine flag (keep it, possibly adjust amount/confidence)
- REJECT a flag (the expense is legitimate business)
- DISCOVER a new add-back in the unflagged vendors

Be conservative. A buyer's QoE analyst would rather miss a small add-back than include a wrong one.

For mixed-use expenses (e.g., meals that are 80% personal, 20% client), use personalPct to indicate the personal portion (0.0 to 1.0).

Consider memo context carefully. For example, "SGT DRAPER" in a security company's meals = legitimate employee expense, not personal.

Return JSON matching the schema exactly.`

function buildPrompt(
  flaggedVendors: AIVendorInput[],
  unflaggedSample: AIVendorInput[],
  context: CompanyContext,
): string {
  return `## Company Context
- Name: ${context.companyName}
- Industry: ${context.industry}
- Annual Revenue: $${Math.round(context.annualRevenue).toLocaleString()}
${context.state ? `- State: ${context.state}` : ''}

## Rules Engine Flagged Vendors (${flaggedVendors.length})
These vendors were flagged by our automated rules. Confirm or reject each flag.

${flaggedVendors.map((v, i) => `${i + 1}. **${v.vendorName}** — $${Math.round(v.totalSpend).toLocaleString()} (${v.txnCount} txns)
   Accounts: ${v.accounts.join(', ') || 'N/A'}
   Memos: ${v.sampleMemos.slice(0, 3).join('; ') || 'None'}
   Rule flag: ${v.ruleFlag} (confidence: ${v.ruleConfidence})`).join('\n\n')}

## Random Unflagged Sample (${unflaggedSample.length})
These vendors were NOT flagged. Review for any add-backs the rules missed.

${unflaggedSample.map((v, i) => `${i + 1}. **${v.vendorName}** — $${Math.round(v.totalSpend).toLocaleString()} (${v.txnCount} txns)
   Accounts: ${v.accounts.join(', ') || 'N/A'}
   Memos: ${v.sampleMemos.slice(0, 3).join('; ') || 'None'}`).join('\n\n')}

## Instructions
1. For each flagged vendor: confirm (adjusting if needed) or reject the flag
2. For unflagged vendors: flag any that look like add-backs
3. Provide a 2-3 sentence buyer narrative summarizing what you found
4. flagType must be one of: OWNER_PERSONAL, ONE_TIME, RELATED_PARTY, TRANSACTION_COST, NORMALIZATION, LOCATION_ANOMALY, or null (if rejecting)
5. category must be one of: PERSONAL_EXPENSES, ONE_TIME_CHARGES, RELATED_PARTY, NON_OPERATING, DISCRETIONARY, OTHER
6. isNewFind: true if this was from the unflagged sample, false if confirming/modifying a rule flag

Return JSON:
{
  "classifications": [
    {
      "vendorName": "string",
      "flagType": "OWNER_PERSONAL" | null,
      "category": "PERSONAL_EXPENSES",
      "description": "string",
      "suggestedAmount": 1234,
      "personalPct": 1.0,
      "confidence": 0.85,
      "isNewFind": false
    }
  ],
  "buyerNarrative": "string"
}`
}

export async function classifyTransactionFlags(
  companyId: string,
  ruleFlags: RuleFlag[],
  vendorProfiles: Map<string, VendorProfile>,
  companyContext: CompanyContext,
): Promise<AIAnalysisResult> {
  const startTime = Date.now()

  // Build flagged vendor inputs
  const flaggedVendors: AIVendorInput[] = ruleFlags
    .filter((f) => f.vendorName)
    .map((f) => {
      const profile = vendorProfiles.get(f.vendorName!)
      return {
        vendorName: f.vendorName!,
        totalSpend: f.suggestedAmount,
        txnCount: f.vendorTxnCount || 1,
        accounts: profile?.accountNames || [],
        sampleMemos: profile?.memos.slice(0, 5) || [],
        ruleFlag: f.sourceRule,
        ruleConfidence: f.confidence,
      }
    })

  // Get unique flagged vendor names
  const flaggedNames = new Set(flaggedVendors.map((v) => v.vendorName.toLowerCase()))

  // Build unflagged sample: random 50 vendors not already flagged
  const unflaggedVendors: AIVendorInput[] = []
  const allVendors = Array.from(vendorProfiles.entries())
    .filter(([name]) => !flaggedNames.has(name.toLowerCase()))
    .sort(() => Math.random() - 0.5)
    .slice(0, 50)

  for (const [vendorName, profile] of allVendors) {
    unflaggedVendors.push({
      vendorName,
      totalSpend: profile.totalSpend,
      txnCount: profile.transactionCount,
      accounts: profile.accountNames,
      sampleMemos: profile.memos.slice(0, 5),
    })
  }

  const prompt = buildPrompt(flaggedVendors, unflaggedVendors, companyContext)

  const { data, usage } = await generateJSON<AIResponseSchema>(
    prompt,
    SYSTEM_PROMPT,
    { model: 'claude-sonnet', maxTokens: 8192, temperature: 0.3 },
  )

  const latencyMs = Date.now() - startTime

  // Log to AIGenerationLog
  await prisma.aIGenerationLog.create({
    data: {
      companyId,
      generationType: 'transaction_classification',
      inputData: JSON.parse(JSON.stringify({
        flaggedCount: flaggedVendors.length,
        unflaggedCount: unflaggedVendors.length,
        companyContext,
      })),
      outputData: JSON.parse(JSON.stringify(data)),
      modelUsed: 'claude-sonnet',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs,
    },
  })

  // Map valid flagType strings to enum values
  const validFlagTypes = new Set(Object.values(TransactionFlagType))

  const classifications: AIClassification[] = (data.classifications || [])
    .filter((c) => c.flagType !== null) // Only include confirmed/new flags, skip rejections
    .map((c) => ({
      vendorName: c.vendorName,
      flagType: (validFlagTypes.has(c.flagType as TransactionFlagType)
        ? c.flagType as TransactionFlagType
        : null),
      category: c.category,
      description: c.description,
      suggestedAmount: c.suggestedAmount,
      personalPct: c.personalPct,
      confidence: Math.min(1, Math.max(0, c.confidence)),
      isNewFind: c.isNewFind,
    }))

  return {
    classifications,
    buyerNarrative: data.buyerNarrative || '',
    totalIdentified: classifications.length,
  }
}
