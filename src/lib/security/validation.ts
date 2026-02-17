/**
 * Input Validation Module
 * Provides Zod schemas and validation utilities for API routes
 *
 * SECURITY: Prevents mass assignment, injection, and type confusion attacks
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { DataRoomAccessLevel, DataRoomStage } from '@prisma/client'

// =============================================================================
// Common Validation Schemas
// =============================================================================

/** UUID v4 format validation */
export const uuidSchema = z.string().uuid('Invalid ID format')

/** SEC-102: Bounded JSON metadata schema for Prisma Json? fields (replaces z.any()) */
const jsonPrimitive = z.union([z.string().max(5000), z.number().finite(), z.boolean(), z.null()])
export const jsonMetadataSchema = z.record(z.string().max(100), jsonPrimitive).optional()

/** Email validation with normalization */
export const emailSchema = z.string().email('Invalid email').transform(val => val.toLowerCase().trim())

/** Safe string that prevents injection */
export const safeStringSchema = z.string()
  .min(1, 'Required')
  .max(1000, 'Too long')
  .refine(val => !/[<>]/.test(val), 'Invalid characters')

/** Pagination parameters with security limits */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // SECURITY: Cap at 100 to prevent DoS via large queries
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Apply pagination limits to raw query params
 * Use this when you can't use Zod validation
 */
export function sanitizePagination(params: {
  page?: string | number | null
  limit?: string | number | null
}): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(params.page || '1'), 10) || 1)
  // SECURITY: Hard cap at 100 items per page
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || '20'), 10) || 20))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

// =============================================================================
// Data Room Schemas
// =============================================================================

/** Valid access levels for data room */
export const dataRoomAccessLevelSchema = z.enum([
  'VIEWER',
  'DOWNLOADER',
  'CONTRIBUTOR',
  'ADMIN',
] as const satisfies readonly DataRoomAccessLevel[])

/** Valid stages for data room access */
export const dataRoomStageSchema = z.enum([
  'PREPARATION',
  'TEASER',
  'POST_NDA',
  'DUE_DILIGENCE',
  'CLOSED',
] as const satisfies readonly DataRoomStage[])

/** Data room access grant request */
export const dataRoomAccessGrantSchema = z.object({
  email: emailSchema,
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  accessLevel: dataRoomAccessLevelSchema.default('VIEWER'),
  maxStage: dataRoomStageSchema.default('TEASER'),
  expiresAt: z.string().datetime().optional().nullable(),
  folderIds: z.array(uuidSchema).optional(),
  notes: z.string().max(2000).optional(),
})

/** Data room access update request */
export const dataRoomAccessUpdateSchema = z.object({
  accessId: uuidSchema,
  accessLevel: dataRoomAccessLevelSchema.optional(),
  maxStage: dataRoomStageSchema.optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  folderIds: z.array(uuidSchema).optional(),
  notes: z.string().max(2000).optional(),
})

// =============================================================================
// File Upload Validation
// =============================================================================

/** Allowed MIME types for data room uploads */
export const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Archives (use with caution)
  'application/zip',
])

/** Allowed MIME types for Evidence Room uploads (stricter subset) */
export const EVIDENCE_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
])

/** Evidence Room max file size: 2 MB */
export const EVIDENCE_MAX_FILE_SIZE = 2 * 1024 * 1024

/** Evidence Room accepted file extensions for HTML accept attribute */
export const EVIDENCE_ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg'

/** Blocked file extensions (even if MIME type is spoofed) */
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'psm1',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'php', 'php3', 'php4', 'php5', 'phtml',
  'py', 'pyc', 'pyo',
  'rb', 'erb',
  'pl', 'pm', 'cgi',
  'asp', 'aspx', 'ascx', 'ashx',
  'jsp', 'jspx',
  'dll', 'so', 'dylib',
  'htaccess', 'htpasswd',
  'svg', // SVG can contain scripts
  'html', 'htm', 'xhtml', 'shtml',
  'xml', 'xsl', 'xslt',
])

/** Magic bytes for file type verification */
export const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  // Office documents (OOXML) are ZIP files
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B, 0x03, 0x04]],
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedName?: string
}

/**
 * Validate uploaded file for security
 */
export async function validateUploadedFile(file: File): Promise<FileValidationResult> {
  // Check file name
  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  // Block dangerous extensions
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { valid: false, error: `File type .${extension} is not allowed` }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` }
  }

  // Verify magic bytes match claimed MIME type
  const signatures = FILE_SIGNATURES[file.type]
  if (signatures) {
    const buffer = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const matchesSignature = signatures.some(signature =>
      signature.every((byte, i) => bytes[i] === byte)
    )

    if (!matchesSignature) {
      return { valid: false, error: 'File content does not match declared type' }
    }
  }

  // Sanitize filename (remove path traversal attempts)
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // Remove consecutive dots
    .replace(/^\./, '_') // Don't start with dot
    .slice(0, 255) // Limit length

  return { valid: true, sanitizedName }
}

// =============================================================================
// Validation Helpers
// =============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse }

/**
 * Validate request body against a Zod schema
 * Returns sanitized data or error response
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))

      return {
        success: false,
        error: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}

// =============================================================================
// Shared Schema Primitives
// =============================================================================

/** Monetary amount: coerces to number, rejects NaN/Infinity, caps at ±$10B */
export const financialAmount = z.coerce.number().finite().min(-10_000_000_000).max(10_000_000_000)
export const optionalFinancialAmount = financialAmount.optional().nullable()

/** Lenient financial amount: accepts null/undefined/NaN/empty-string and coerces to 0 */
export const lenientFinancialAmount = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return 0
    const n = Number(val)
    return Number.isFinite(n) ? n : 0
  },
  z.number().finite().min(-10_000_000_000).max(10_000_000_000)
)
export const optionalLenientFinancialAmount = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return null
    const n = Number(val)
    return Number.isFinite(n) ? n : null
  },
  z.number().finite().min(-10_000_000_000).max(10_000_000_000).nullable().optional()
)

/** Rate/percentage: 0-1 range (e.g., 0.05 = 5%) */
export const rateSchema = z.coerce.number().finite().min(0).max(1)
export const optionalRate = rateSchema.optional().nullable()

/** Safe bounded strings */
export const shortText = z.string().max(500)
export const longText = z.string().max(5000)

// =============================================================================
// API Route Schemas
// =============================================================================

/** Income Statement PUT — required revenue/costs, optional detailed expenses */
export const incomeStatementSchema = z.object({
  grossRevenue: financialAmount,
  cogs: financialAmount,
  operatingExpenses: financialAmount,
  depreciation: optionalFinancialAmount,
  amortization: optionalFinancialAmount,
  interestExpense: optionalFinancialAmount,
  taxExpense: optionalFinancialAmount,
})

/** Balance Sheet PUT — all fields default to 0 */
export const balanceSheetSchema = z.object({
  cash: financialAmount.default(0),
  accountsReceivable: financialAmount.default(0),
  inventory: financialAmount.default(0),
  prepaidExpenses: financialAmount.default(0),
  otherCurrentAssets: financialAmount.default(0),
  ppeGross: financialAmount.default(0),
  accumulatedDepreciation: financialAmount.default(0),
  intangibleAssets: financialAmount.default(0),
  otherLongTermAssets: financialAmount.default(0),
  accountsPayable: financialAmount.default(0),
  accruedExpenses: financialAmount.default(0),
  currentPortionLtd: financialAmount.default(0),
  otherCurrentLiabilities: financialAmount.default(0),
  longTermDebt: financialAmount.default(0),
  deferredTaxLiabilities: financialAmount.default(0),
  otherLongTermLiabilities: financialAmount.default(0),
  retainedEarnings: financialAmount.default(0),
  ownersEquity: financialAmount.default(0),
})

/** Cash Flow PUT — optional prior period, all financial fields default to 0 */
export const cashFlowSchema = z.object({
  priorPeriodId: uuidSchema.nullable().default(null),
  netIncome: financialAmount.default(0),
  depreciation: financialAmount.default(0),
  amortization: financialAmount.default(0),
  changeInAccountsReceivable: financialAmount.default(0),
  changeInInventory: financialAmount.default(0),
  changeInPrepaidExpenses: financialAmount.default(0),
  changeInOtherCurrentAssets: financialAmount.default(0),
  changeInAccountsPayable: financialAmount.default(0),
  changeInAccruedExpenses: financialAmount.default(0),
  changeInOtherCurrentLiabilities: financialAmount.default(0),
  changeInDeferredTaxLiabilities: financialAmount.default(0),
  otherOperatingAdjustments: financialAmount.default(0),
  capitalExpenditures: financialAmount.default(0),
  changeInIntangibleAssets: financialAmount.default(0),
  changeInOtherLongTermAssets: financialAmount.default(0),
  otherInvestingActivities: financialAmount.default(0),
  changeInCurrentPortionLtd: financialAmount.default(0),
  changeInLongTermDebt: financialAmount.default(0),
  changeInOtherLongTermLiabilities: financialAmount.default(0),
  changeInOwnersEquity: financialAmount.default(0),
  otherFinancingActivities: financialAmount.default(0),
  beginningCash: financialAmount.default(0),
  endingCash: financialAmount.default(0),
})

/** DCF Assumptions PUT */
export const dcfAssumptionsSchema = z.object({
  baseFCF: optionalFinancialAmount,
  riskFreeRate: z.coerce.number().finite().min(0).max(1).optional().nullable(),
  marketRiskPremium: z.coerce.number().finite().min(0).max(1).optional().nullable(),
  beta: z.coerce.number().finite().min(0).max(5).optional().nullable(),
  sizeRiskPremium: z.coerce.number().finite().min(0).max(1).optional().nullable(),
  companySpecificRisk: optionalRate,
  costOfDebtOverride: optionalRate,
  taxRateOverride: optionalRate,
  debtWeightOverride: optionalRate,
  growthAssumptions: z.union([
    z.record(z.string(), z.coerce.number().finite()),
    z.array(z.coerce.number().finite()),
  ]).optional().nullable(),
  terminalMethod: z.enum(['gordon', 'exit_multiple']).optional().nullable(),
  perpetualGrowthRate: z.coerce.number().finite().min(0).max(0.10).optional().nullable(),
  exitMultiple: z.coerce.number().finite().min(0).max(100).optional().nullable(),
  calculatedWACC: z.coerce.number().finite().min(0).max(1).optional().nullable(),
  enterpriseValue: optionalFinancialAmount,
  equityValue: optionalFinancialAmount,
  useMidYearConvention: z.boolean().optional().nullable(),
  ebitdaTier: z.string().optional().nullable(),
  useDCFValue: z.boolean().optional().nullable(),
  ebitdaMultipleLowOverride: z.coerce.number().finite().min(0).max(100).optional().nullable(),
  ebitdaMultipleHighOverride: z.coerce.number().finite().min(0).max(100).optional().nullable(),
})

/** Company PUT — partial update, all fields optional */
export const companyUpdateSchema = z.object({
  name: shortText.optional(),
  icbIndustry: shortText.optional().nullable(),
  icbSuperSector: shortText.optional().nullable(),
  icbSector: shortText.optional().nullable(),
  icbSubSector: shortText.optional().nullable(),
  annualRevenue: optionalFinancialAmount,
  annualEbitda: optionalFinancialAmount,
  ownerCompensation: optionalFinancialAmount,
  fiscalYearEndMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
  fiscalYearEndDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
})

// SEC-061: Typed JSON schemas for Prisma Json? fields (replaces z.any())
const financialAccountItem = z.object({
  name: z.string().max(200),
  type: z.string().max(100).optional(),
  value: z.preprocess(
    (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0 },
    z.number().finite()
  ).optional(),
  balance: z.preprocess(
    (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0 },
    z.number().finite()
  ).optional(),
  institution: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  // SEC-080: Extra fields from wizard (previously used .passthrough())
  id: z.string().max(100).optional(),
  category: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  amount: z.preprocess(
    (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0 },
    z.number().finite()
  ).optional(),
  taxTreatment: z.string().max(100).optional(),
})

const financialJsonArray = z.array(financialAccountItem).max(100).optional().nullable()

const businessOwnershipSchema = z.object({
  percentage: z.coerce.number().finite().min(0).max(100).optional(),
  shares: z.coerce.number().finite().min(0).optional(),
  shareClass: z.string().max(100).optional(),
  vestingComplete: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
}).optional().nullable() // SEC-080: Strip unknown fields instead of passing through

/** Personal Financials PUT */
export const personalFinancialsSchema = z.object({
  retirementAccounts: financialJsonArray,
  totalRetirement: optionalLenientFinancialAmount,
  personalAssets: financialJsonArray,
  personalLiabilities: financialJsonArray,
  netWorth: optionalLenientFinancialAmount,
  exitGoalAmount: optionalLenientFinancialAmount,
  retirementAge: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null
      const n = Number(val)
      return Number.isFinite(n) ? Math.round(n) : null
    },
    z.number().int().min(0).max(120).nullable().optional()
  ),
  currentAge: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null
      const n = Number(val)
      return Number.isFinite(n) ? Math.round(n) : null
    },
    z.number().int().min(0).max(120).nullable().optional()
  ),
  businessOwnership: businessOwnershipSchema,
  notes: longText.optional().nullable(),
})

/** Deal Create POST */
export const dealCreateSchema = z.object({
  companyId: uuidSchema,
  codeName: shortText.min(1),
  description: longText.optional().nullable(),
  targetCloseDate: z.string().max(100).optional().nullable(),
  requireSellerApproval: z.boolean().default(true),
})

/** Deal Update PUT — all fields optional */
export const dealUpdateSchema = z.object({
  codeName: shortText.optional(),
  description: longText.optional().nullable(),
  status: z.enum(['ACTIVE', 'CLOSED', 'TERMINATED', 'ON_HOLD']).optional(),
  targetCloseDate: z.string().max(100).optional().nullable(),
  requireSellerApproval: z.boolean().optional(),
})

/** Buyer Update PUT — all fields optional */
export const buyerUpdateSchema = z.object({
  name: shortText.optional(),
  buyerType: z.enum(['STRATEGIC', 'FINANCIAL', 'INDIVIDUAL', 'MANAGEMENT', 'ESOP', 'OTHER']).optional(),
  tier: z.enum(['A_TIER', 'B_TIER', 'C_TIER', 'D_TIER']).optional(),
  website: z.string().max(2000).optional().nullable(),
  description: longText.optional().nullable(),
  industry: shortText.optional().nullable(),
  location: shortText.optional().nullable(),
  internalNotes: longText.optional().nullable(),
  tags: z.array(z.string().max(100)).max(50).optional().nullable(),
  ioiAmount: optionalFinancialAmount,
  loiAmount: optionalFinancialAmount,
  ioiDeadline: z.string().max(100).optional().nullable(),
  loiDeadline: z.string().max(100).optional().nullable(),
  exclusivityStart: z.string().max(100).optional().nullable(),
  exclusivityEnd: z.string().max(100).optional().nullable(),
  approvalStatus: z.string().max(50).optional(),
  approvalNotes: longText.optional().nullable(),
})

/** Subscription Upgrade POST */
export const subscriptionUpgradeSchema = z.object({
  targetPlan: z.enum(['foundation', 'growth', 'exit-ready']),
  billingCycle: z.enum(['monthly', 'annual']).default('annual'),
})

/** Assess/Save POST — public assessment signup */
export const assessSaveSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  basics: z.object({
    email: emailSchema,
    companyName: z.string().min(1).max(200),
    businessDescription: z.string().min(1).max(5000),
    annualRevenue: financialAmount.refine(v => v > 0, 'Revenue must be positive'),
  }),
  profile: z.object({
    revenueModel: z.enum(['PROJECT_BASED', 'TRANSACTIONAL', 'RECURRING_CONTRACTS', 'SUBSCRIPTION_SAAS']),
    laborIntensity: z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']),
    assetIntensity: z.enum(['ASSET_LIGHT', 'MODERATE', 'ASSET_HEAVY']),
    ownerInvolvement: z.enum(['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
    grossMarginProxy: z.enum(['LOW', 'MODERATE', 'GOOD', 'EXCELLENT']),
  }),
  scan: z.object({
    answers: z.record(z.string(), z.boolean()),
    riskCount: z.coerce.number().int().min(0).max(50),
    briScore: z.coerce.number().finite().min(0).max(100),
  }),
  results: z.object({
    briScore: z.coerce.number().finite().min(0).max(100),
    currentValue: financialAmount,
    potentialValue: financialAmount,
    valueGap: financialAmount,
    baseMultiple: z.coerce.number().finite().min(0).max(100),
    finalMultiple: z.coerce.number().finite().min(0).max(100),
    categoryBreakdown: z.record(z.string(), z.coerce.number().finite().min(0).max(1)).optional(),
    topTasks: z.array(z.object({
      title: z.string().max(500),
      category: z.string().max(100),
      estimatedImpact: financialAmount,
    })).max(10).optional(),
  }),
})

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): ValidationResult<z.infer<T>> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: result.data }
}
