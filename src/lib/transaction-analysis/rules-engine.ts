import { prisma } from '@/lib/prisma'
import { TransactionFlagType } from '@prisma/client'
import type { VendorProfile, TransactionSummary, RuleFlag, AnalysisResult } from './types'

// ─── Personal Vendor Patterns ───────────────────────────────────────

const PERSONAL_VENDOR_PATTERNS = [
  // Vehicle / luxury auto
  /\b(bmw|mercedes|lexus|audi|porsche|tesla|land rover|jaguar|range rover)\b/i,
  /\b(bmw financial|ally auto|toyota financial|honda financial)\b/i,
  // Vehicle services
  /\b(onstar|siriusxm|sirius xm|carwash|car wash|jiffy lube|valvoline|meineke)\b/i,
  // Personal subscriptions
  /\b(netflix|spotify|hulu|disney\+?|hbo|apple tv|youtube premium|peloton|equinox)\b/i,
  /\b(amazon prime|costco membership|sam'?s club)\b/i,
  // Personal health/wellness
  /\b(nugenix|colon broom|furryking|chewy|petco|petsmart|veterinar)\b/i,
  /\b(gym|fitness|crossfit|orangetheory|planet fitness|24 hour fitness)\b/i,
  // Dining (high-end / personal)
  /\b(dan tana|nobu|mastro|ruth'?s chris|morton'?s|capital grille|boa steakhouse)\b/i,
  // Entertainment
  /\b(stubhub|ticketmaster|vivid seats|seatgeek|fandango|golf|country club)\b/i,
  // Travel (personal)
  /\b(airbnb|vrbo|carnival cruise|royal caribbean|disney cruise)\b/i,
  // Insurance (personal)
  /\b(allstate|state farm|geico|progressive|usaa)\s*(personal|home|auto|life)\b/i,
]

const PERSONAL_MEMO_KEYWORDS = [
  // Health supplements / personal products
  /\b(nugenix|colon broom|furryking|supplement|vitamin|protein powder)\b/i,
  // Personal items
  /\b(birthday|anniversary|wedding|vacation|holiday gift|personal|family trip)\b/i,
  // Home
  /\b(lawn care|landscaping|pool service|home depot|lowe'?s|ikea)\b/i,
  /\b(house cleaning|maid|housekeeper)\b/i,
]

// Categories where personal expenses often hide
const HIDING_CATEGORIES = [
  'office expenses', 'office supplies', 'supplies', 'miscellaneous',
  'other expenses', 'other general', 'general expenses', 'sundry',
  'meals and entertainment', 'meals', 'travel', 'automobile',
  'bank charges', 'dues and subscriptions',
]

// ─── Owner Vehicle Patterns ─────────────────────────────────────────

const LUXURY_AUTO_PATTERNS = [
  /\b(bmw|mercedes|benz|lexus|audi|porsche|tesla|land rover|jaguar|range rover|cadillac|lincoln|infiniti|acura)\b/i,
]

const VEHICLE_SUBSCRIPTION_PATTERNS = [
  /\b(onstar|siriusxm|sirius xm|xm radio)\b/i,
]

// ─── Transaction Cost Patterns ──────────────────────────────────────

const LEGAL_ADVISORY_PATTERNS = [
  /\b(law firm|attorney|counsel|legal|esq|llp|law office)\b/i,
  /\b(advisory|advisor|consultant|consulting group|capital advisor)\b/i,
  /\b(investment bank|m&a|merger|acquisition|due diligence)\b/i,
  /\b(valuation|appraisal|fairness opinion)\b/i,
]

const MA_MEMO_KEYWORDS = [
  /\b(m&a|merger|acquisition|due diligence|diligence|deal|transaction)\b/i,
  /\b(loi|letter of intent|purchase agreement|asset purchase|stock purchase)\b/i,
  /\b(buyer|acquir|exit|sale of business|business sale)\b/i,
  /\b(broker fee|finder'?s fee|success fee|engagement fee)\b/i,
]

// ─── Location Detection ─────────────────────────────────────────────

const US_STATES_ABBR = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const KNOWN_CITIES = [
  'las vegas', 'miami', 'new york', 'los angeles', 'chicago', 'houston',
  'phoenix', 'san antonio', 'san diego', 'dallas', 'henderson', 'scottsdale',
  'palm beach', 'naples', 'aspen', 'jackson hole', 'honolulu', 'maui',
]

function extractLocation(text: string): string | null {
  if (!text) return null
  const upper = text.toUpperCase()

  // Check for state abbreviations at end of string or after a space
  for (const state of US_STATES_ABBR) {
    const pattern = new RegExp(`\\b${state}\\b`, 'i')
    if (pattern.test(upper)) return state
  }

  // Check for known cities
  const lower = text.toLowerCase()
  for (const city of KNOWN_CITIES) {
    if (lower.includes(city)) return city
  }

  return null
}

// ─── Rule Functions ─────────────────────────────────────────────────

function rule1_largeNonRecurring(
  vendorProfiles: Map<string, VendorProfile>,
): RuleFlag[] {
  const flags: RuleFlag[] = []

  for (const [vendorName, profile] of vendorProfiles) {
    // Vendors with <= 3 transactions and any single txn > $5K
    if (profile.transactionCount <= 3 && profile.maxTransaction > 5000) {
      flags.push({
        flagType: TransactionFlagType.ONE_TIME,
        category: 'ONE_TIME_CHARGES',
        description: `${vendorName}: ${profile.transactionCount} transaction(s) totaling $${Math.round(profile.totalSpend).toLocaleString()} — possible non-recurring expense`,
        suggestedAmount: profile.totalSpend,
        personalPct: null,
        confidence: profile.maxTransaction > 25000 ? 0.85 : 0.65,
        sourceRule: 'large_non_recurring',
        vendorName,
        vendorTxnCount: profile.transactionCount,
        vendorTotalSpend: profile.totalSpend,
        transactionId: null,
      })
    }
  }

  return flags
}

function rule2_yoySpike(
  currentCategories: Map<string, number>,
  priorCategories: Map<string, number>,
): RuleFlag[] {
  const flags: RuleFlag[] = []

  for (const [category, currentTotal] of currentCategories) {
    const priorTotal = priorCategories.get(category) || 0
    if (priorTotal === 0) continue

    const increase = currentTotal - priorTotal
    const pctIncrease = increase / priorTotal

    // Category increased >50% AND >$10K absolute
    if (pctIncrease > 0.5 && increase > 10000) {
      flags.push({
        flagType: TransactionFlagType.NORMALIZATION,
        category: 'ONE_TIME_CHARGES',
        description: `${category}: jumped from $${Math.round(priorTotal).toLocaleString()} to $${Math.round(currentTotal).toLocaleString()} (+${Math.round(pctIncrease * 100)}%) — possible non-recurring spike`,
        suggestedAmount: increase,
        personalPct: null,
        confidence: pctIncrease > 1.0 ? 0.8 : 0.6,
        sourceRule: 'yoy_category_spike',
        vendorName: null,
        vendorTxnCount: null,
        vendorTotalSpend: null,
        transactionId: null,
      })
    }
  }

  return flags
}

function rule3_personalVendor(
  vendorProfiles: Map<string, VendorProfile>,
): RuleFlag[] {
  const flags: RuleFlag[] = []

  for (const [vendorName, profile] of vendorProfiles) {
    for (const pattern of PERSONAL_VENDOR_PATTERNS) {
      if (pattern.test(vendorName)) {
        flags.push({
          flagType: TransactionFlagType.OWNER_PERSONAL,
          category: 'PERSONAL_EXPENSES',
          description: `${vendorName}: $${Math.round(profile.totalSpend).toLocaleString()} across ${profile.transactionCount} transaction(s) — likely personal expense`,
          suggestedAmount: profile.totalSpend,
          personalPct: 1.0,
          confidence: 0.85,
          sourceRule: 'personal_vendor_match',
          vendorName,
          vendorTxnCount: profile.transactionCount,
          vendorTotalSpend: profile.totalSpend,
          transactionId: null,
        })
        break // one match per vendor
      }
    }
  }

  return flags
}

function rule4_personalMemo(
  transactions: TransactionSummary[],
): RuleFlag[] {
  const flags: RuleFlag[] = []
  const flaggedVendors = new Set<string>()

  for (const txn of transactions) {
    // Only check "hiding" categories
    const accountLower = (txn.accountName || '').toLowerCase()
    const isHidingCategory = HIDING_CATEGORIES.some((cat) => accountLower.includes(cat))
    if (!isHidingCategory) continue

    const memoText = txn.memo || ''
    const vendorText = txn.vendorName || ''
    const combinedText = `${vendorText} ${memoText}`

    for (const pattern of PERSONAL_MEMO_KEYWORDS) {
      if (pattern.test(combinedText)) {
        const vendorKey = txn.vendorName || txn.memo || txn.id
        if (flaggedVendors.has(vendorKey)) break

        flaggedVendors.add(vendorKey)
        flags.push({
          flagType: TransactionFlagType.OWNER_PERSONAL,
          category: 'PERSONAL_EXPENSES',
          description: `"${(txn.vendorName || txn.memo || '').substring(0, 60)}" in ${txn.accountName || 'expense account'}: $${Math.round(txn.amount).toLocaleString()} — possible personal expense hidden in operating category`,
          suggestedAmount: txn.amount,
          personalPct: 1.0,
          confidence: 0.7,
          sourceRule: 'personal_memo_scan',
          vendorName: txn.vendorName,
          vendorTxnCount: 1,
          vendorTotalSpend: txn.amount,
          transactionId: txn.id,
        })
        break
      }
    }
  }

  return flags
}

function rule5_locationAnomaly(
  transactions: TransactionSummary[],
  companyState: string | null,
): RuleFlag[] {
  if (!companyState) return []

  const flags: RuleFlag[] = []
  const flaggedVendors = new Set<string>()
  const companyStateLower = companyState.toLowerCase()

  for (const txn of transactions) {
    const combinedText = `${txn.vendorName || ''} ${txn.memo || ''}`
    const txnLocation = extractLocation(combinedText)

    if (txnLocation && txnLocation.toLowerCase() !== companyStateLower) {
      const vendorKey = txn.vendorName || combinedText
      if (flaggedVendors.has(vendorKey)) continue
      flaggedVendors.add(vendorKey)

      flags.push({
        flagType: TransactionFlagType.LOCATION_ANOMALY,
        category: 'PERSONAL_EXPENSES',
        description: `${txn.vendorName || 'Transaction'} (${txnLocation}): $${Math.round(txn.amount).toLocaleString()} — location doesn't match company state (${companyState})`,
        suggestedAmount: txn.amount,
        personalPct: null,
        confidence: 0.5,
        sourceRule: 'location_anomaly',
        vendorName: txn.vendorName,
        vendorTxnCount: 1,
        vendorTotalSpend: txn.amount,
        transactionId: txn.id,
      })
    }
  }

  return flags
}

function rule6_ownerVehicle(
  vendorProfiles: Map<string, VendorProfile>,
): RuleFlag[] {
  const flags: RuleFlag[] = []

  for (const [vendorName, profile] of vendorProfiles) {
    const isLuxuryAuto = LUXURY_AUTO_PATTERNS.some((p) => p.test(vendorName))
    const isVehicleSub = VEHICLE_SUBSCRIPTION_PATTERNS.some((p) => p.test(vendorName))

    if (isLuxuryAuto || isVehicleSub) {
      flags.push({
        flagType: TransactionFlagType.OWNER_PERSONAL,
        category: 'PERSONAL_EXPENSES',
        description: `${vendorName}: $${Math.round(profile.totalSpend).toLocaleString()} — ${isLuxuryAuto ? 'luxury vehicle payment' : 'vehicle subscription'} likely personal`,
        suggestedAmount: profile.totalSpend,
        personalPct: 1.0,
        confidence: 0.9,
        sourceRule: 'owner_vehicle',
        vendorName,
        vendorTxnCount: profile.transactionCount,
        vendorTotalSpend: profile.totalSpend,
        transactionId: null,
      })
    }
  }

  return flags
}

function rule7_transactionCosts(
  vendorProfiles: Map<string, VendorProfile>,
  transactions: TransactionSummary[],
): RuleFlag[] {
  const flags: RuleFlag[] = []
  const flaggedVendors = new Set<string>()

  // Check vendor names for legal/advisory patterns
  for (const [vendorName, profile] of vendorProfiles) {
    for (const pattern of LEGAL_ADVISORY_PATTERNS) {
      if (pattern.test(vendorName)) {
        flaggedVendors.add(vendorName)
        flags.push({
          flagType: TransactionFlagType.TRANSACTION_COST,
          category: 'ONE_TIME_CHARGES',
          description: `${vendorName}: $${Math.round(profile.totalSpend).toLocaleString()} — legal/advisory vendor, possible M&A transaction cost`,
          suggestedAmount: profile.totalSpend,
          personalPct: null,
          confidence: 0.55,
          sourceRule: 'transaction_costs',
          vendorName,
          vendorTxnCount: profile.transactionCount,
          vendorTotalSpend: profile.totalSpend,
          transactionId: null,
        })
        break
      }
    }
  }

  // Check memos for M&A keywords
  for (const txn of transactions) {
    if (txn.vendorName && flaggedVendors.has(txn.vendorName)) continue

    const memoText = `${txn.memo || ''} ${txn.vendorName || ''}`
    for (const pattern of MA_MEMO_KEYWORDS) {
      if (pattern.test(memoText)) {
        const vendorKey = txn.vendorName || txn.id
        if (flaggedVendors.has(vendorKey)) break
        flaggedVendors.add(vendorKey)

        flags.push({
          flagType: TransactionFlagType.TRANSACTION_COST,
          category: 'ONE_TIME_CHARGES',
          description: `"${(txn.vendorName || txn.memo || '').substring(0, 60)}": $${Math.round(txn.amount).toLocaleString()} — memo mentions M&A/transaction terms`,
          suggestedAmount: txn.amount,
          personalPct: null,
          confidence: 0.6,
          sourceRule: 'transaction_costs_memo',
          vendorName: txn.vendorName,
          vendorTxnCount: 1,
          vendorTotalSpend: txn.amount,
          transactionId: txn.id,
        })
        break
      }
    }
  }

  return flags
}

// ─── Deduplication ──────────────────────────────────────────────────

function deduplicateFlags(flags: RuleFlag[]): RuleFlag[] {
  const vendorMap = new Map<string, RuleFlag>()

  for (const flag of flags) {
    const key = flag.vendorName?.toLowerCase() || flag.transactionId || flag.description
    const existing = vendorMap.get(key)

    if (!existing || flag.confidence > existing.confidence) {
      vendorMap.set(key, flag)
    }
  }

  return Array.from(vendorMap.values())
}

// ─── Main Export ────────────────────────────────────────────────────

export async function runRulesEngine(
  companyId: string,
  startDate: Date,
  endDate: Date,
  priorYearStart?: Date,
  priorYearEnd?: Date,
): Promise<AnalysisResult> {
  // Fetch all transactions for the period
  const rawTransactions = await prisma.qBTransaction.findMany({
    where: {
      companyId,
      txnDate: { gte: startDate, lte: endDate },
      amount: { gt: 0 },
    },
    orderBy: { amount: 'desc' },
  })

  const transactions: TransactionSummary[] = rawTransactions.map((t) => ({
    id: t.id,
    vendorName: t.vendorName,
    memo: t.memo,
    accountName: t.accountName,
    amount: Number(t.amount),
    txnDate: t.txnDate,
    txnType: t.txnType,
  }))

  // Build vendor profiles
  const vendorProfiles = new Map<string, VendorProfile>()
  for (const txn of transactions) {
    if (!txn.vendorName) continue
    const key = txn.vendorName

    const existing = vendorProfiles.get(key)
    if (existing) {
      existing.totalSpend += txn.amount
      existing.transactionCount += 1
      existing.maxTransaction = Math.max(existing.maxTransaction, txn.amount)
      if (txn.accountName && !existing.accountNames.includes(txn.accountName)) {
        existing.accountNames.push(txn.accountName)
      }
      if (txn.memo && !existing.memos.includes(txn.memo)) {
        existing.memos.push(txn.memo)
      }
      if (txn.txnDate < existing.dateRange.first) existing.dateRange.first = txn.txnDate
      if (txn.txnDate > existing.dateRange.last) existing.dateRange.last = txn.txnDate
    } else {
      vendorProfiles.set(key, {
        vendorName: txn.vendorName,
        totalSpend: txn.amount,
        transactionCount: 1,
        avgTransaction: txn.amount,
        maxTransaction: txn.amount,
        accountNames: txn.accountName ? [txn.accountName] : [],
        memos: txn.memo ? [txn.memo] : [],
        dateRange: { first: txn.txnDate, last: txn.txnDate },
      })
    }
  }

  // Compute averages
  for (const profile of vendorProfiles.values()) {
    profile.avgTransaction = profile.totalSpend / profile.transactionCount
  }

  // Build category totals for current period
  const currentCategories = new Map<string, number>()
  for (const txn of transactions) {
    const cat = txn.accountName || 'Uncategorized'
    currentCategories.set(cat, (currentCategories.get(cat) || 0) + txn.amount)
  }

  // Build prior-year category totals if dates provided
  let priorCategories = new Map<string, number>()
  if (priorYearStart && priorYearEnd) {
    const priorTransactions = await prisma.qBTransaction.findMany({
      where: {
        companyId,
        txnDate: { gte: priorYearStart, lte: priorYearEnd },
        amount: { gt: 0 },
      },
    })
    for (const txn of priorTransactions) {
      const cat = txn.accountName || 'Uncategorized'
      priorCategories.set(cat, (priorCategories.get(cat) || 0) + Number(txn.amount))
    }
  }

  // Get company state for location anomaly detection
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { businessProfile: true },
  })
  const profile = company?.businessProfile as Record<string, unknown> | null
  const companyState = (profile?.state as string) || (profile?.location as string) || null

  // Run all 7 rules
  const allFlags: RuleFlag[] = [
    ...rule1_largeNonRecurring(vendorProfiles),
    ...rule2_yoySpike(currentCategories, priorCategories),
    ...rule3_personalVendor(vendorProfiles),
    ...rule4_personalMemo(transactions),
    ...rule5_locationAnomaly(transactions, companyState),
    ...rule6_ownerVehicle(vendorProfiles),
    ...rule7_transactionCosts(vendorProfiles, transactions),
  ]

  // Deduplicate
  const flags = deduplicateFlags(allFlags)

  const totalExpenseAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

  return {
    flags,
    vendorProfiles,
    totalTransactions: transactions.length,
    totalExpenseAmount,
  }
}
