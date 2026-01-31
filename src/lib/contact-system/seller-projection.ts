/**
 * Seller Projection Layer
 *
 * Sanitizes and projects data for seller-facing views.
 * Ensures no internal/sensitive information is leaked to sellers.
 */

import { DealStage, ApprovalStatus, BuyerType } from '@prisma/client'
import { STAGE_LABELS } from './stage-service'
import { BUYER_TYPE_LABELS, APPROVAL_STATUS_LABELS } from './constants'

// Exit stages set for efficient lookup
const EXIT_STAGE_SET = new Set<DealStage>([
  DealStage.PASSED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
  DealStage.DECLINED,
  DealStage.IOI_DECLINED,
])

function isExitStage(stage: DealStage): boolean {
  return EXIT_STAGE_SET.has(stage)
}

// ============================================
// TYPES
// ============================================

/**
 * Sanitized buyer data for seller view
 */
export interface SellerBuyerView {
  id: string
  companyName: string
  companyType: string // Label, not enum value
  industry: string | null
  headquarters: string | null
  employeeRange: string | null
  currentStage: string // Label, not enum value
  approvalStatus: string // Label, not enum value
  addedDate: string
  lastActivityDate: string | null
  // Metrics that sellers can see
  hasNDA: boolean
  hasCIM: boolean
  hasIOI: boolean
  hasLOI: boolean
  // Progress indicator (0-100)
  progressPercent: number
}

/**
 * Sanitized deal summary for seller view
 */
export interface SellerDealSummary {
  id: string
  codeName: string
  status: string
  startDate: string
  targetCloseDate: string | null
  stats: {
    totalBuyers: number
    pendingApproval: number
    approved: number
    denied: number
    onHold: number
    activeInProcess: number
    passedOrWithdrawn: number
  }
  stageBreakdown: Array<{
    stage: string
    count: number
  }>
}

/**
 * Raw buyer data from database
 */
interface RawBuyer {
  id: string
  currentStage: DealStage
  approvalStatus: ApprovalStatus
  createdAt: Date
  stageUpdatedAt: Date
  teaserSentAt: Date | null
  ndaExecutedAt: Date | null
  cimAccessAt: Date | null
  ioiReceivedAt: Date | null
  loiReceivedAt: Date | null
  closedAt: Date | null
  canonicalCompany: {
    name: string
    companyType: BuyerType
    industryName: string | null
    headquarters: string | null
    employeeCount: number | null
  }
  // These should NOT be exposed to seller
  internalNotes?: string
  tags?: string[]
  contacts?: unknown[]
}

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Fields that should NEVER be exposed to sellers
 */
const BLOCKED_FIELDS = [
  'internalNotes',
  'tags',
  'contacts',
  'canonicalCompanyId',
  'createdByUserId',
  'approvedByUserId',
  'exitReason',
  // Financial details before appropriate stage
  'ioiAmount',
  'loiAmount',
  'exclusivityStart',
  'exclusivityEnd',
]

/**
 * Convert employee count to a range string
 */
function getEmployeeRange(count: number | null): string | null {
  if (!count) return null
  if (count < 50) return '< 50'
  if (count < 200) return '50-199'
  if (count < 500) return '200-499'
  if (count < 1000) return '500-999'
  if (count < 5000) return '1,000-4,999'
  return '5,000+'
}

/**
 * Calculate progress percentage based on stage
 */
function calculateProgress(stage: DealStage): number {
  const stageOrder: DealStage[] = [
    DealStage.IDENTIFIED,
    DealStage.SELLER_REVIEWING,
    DealStage.APPROVED,
    DealStage.TEASER_SENT,
    DealStage.INTERESTED,
    DealStage.NDA_SENT,
    DealStage.NDA_NEGOTIATING,
    DealStage.NDA_EXECUTED,
    DealStage.CIM_ACCESS,
    DealStage.MANAGEMENT_MEETING_SCHEDULED,
    DealStage.MANAGEMENT_MEETING_COMPLETED,
    DealStage.IOI_REQUESTED,
    DealStage.IOI_RECEIVED,
    DealStage.IOI_ACCEPTED,
    DealStage.LOI_REQUESTED,
    DealStage.LOI_RECEIVED,
    DealStage.LOI_SELECTED,
    DealStage.DUE_DILIGENCE,
    DealStage.PA_DRAFTING,
    DealStage.PA_NEGOTIATING,
    DealStage.CLOSING,
    DealStage.CLOSED,
  ]

  // Also include LOI_BACKUP as exit for progress calculation
  if (isExitStage(stage) || stage === DealStage.LOI_BACKUP) return 0
  if (stage === DealStage.CLOSED) return 100

  const index = stageOrder.indexOf(stage)
  if (index === -1) return 0
  return Math.round((index / (stageOrder.length - 1)) * 100)
}

/**
 * Sanitize a single buyer for seller view
 */
export function sanitizeBuyerForSeller(buyer: RawBuyer): SellerBuyerView {
  return {
    id: buyer.id,
    companyName: buyer.canonicalCompany.name,
    companyType: BUYER_TYPE_LABELS[buyer.canonicalCompany.companyType],
    industry: buyer.canonicalCompany.industryName,
    headquarters: buyer.canonicalCompany.headquarters,
    employeeRange: getEmployeeRange(buyer.canonicalCompany.employeeCount),
    currentStage: STAGE_LABELS[buyer.currentStage],
    approvalStatus: APPROVAL_STATUS_LABELS[buyer.approvalStatus],
    addedDate: buyer.createdAt.toISOString().split('T')[0],
    lastActivityDate: buyer.stageUpdatedAt?.toISOString().split('T')[0] || null,
    hasNDA: !!buyer.ndaExecutedAt,
    hasCIM: !!buyer.cimAccessAt,
    hasIOI: !!buyer.ioiReceivedAt,
    hasLOI: !!buyer.loiReceivedAt,
    progressPercent: calculateProgress(buyer.currentStage),
  }
}

/**
 * Sanitize multiple buyers for seller view
 */
export function sanitizeBuyersForSeller(buyers: RawBuyer[]): SellerBuyerView[] {
  return buyers.map(sanitizeBuyerForSeller)
}

/**
 * Create deal summary for seller view
 */
export function createSellerDealSummary(
  deal: {
    id: string
    codeName: string
    status: string
    startedAt: Date
    targetCloseDate: Date | null
  },
  buyers: RawBuyer[]
): SellerDealSummary {
  // Calculate stats
  const stats = {
    totalBuyers: buyers.length,
    pendingApproval: buyers.filter(b => b.approvalStatus === ApprovalStatus.PENDING).length,
    approved: buyers.filter(b => b.approvalStatus === ApprovalStatus.APPROVED).length,
    denied: buyers.filter(b => b.approvalStatus === ApprovalStatus.DENIED).length,
    onHold: buyers.filter(b => b.approvalStatus === ApprovalStatus.HOLD).length,
    activeInProcess: buyers.filter(b =>
      b.approvalStatus === ApprovalStatus.APPROVED &&
      !isExitStage(b.currentStage)
    ).length,
    passedOrWithdrawn: buyers.filter(b =>
      isExitStage(b.currentStage)
    ).length,
  }

  // Calculate stage breakdown (only for approved buyers)
  const approvedBuyers = buyers.filter(b => b.approvalStatus === ApprovalStatus.APPROVED)
  const stageCounts = new Map<string, number>()

  for (const buyer of approvedBuyers) {
    const stageLabel = STAGE_LABELS[buyer.currentStage]
    stageCounts.set(stageLabel, (stageCounts.get(stageLabel) || 0) + 1)
  }

  const stageBreakdown = Array.from(stageCounts.entries()).map(([stage, count]) => ({
    stage,
    count,
  }))

  return {
    id: deal.id,
    codeName: deal.codeName,
    status: deal.status,
    startDate: deal.startedAt.toISOString().split('T')[0],
    targetCloseDate: deal.targetCloseDate?.toISOString().split('T')[0] || null,
    stats,
    stageBreakdown,
  }
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that an object doesn't contain blocked fields
 */
export function validateNoBlockedFields<T extends object>(obj: T): boolean {
  const keys = Object.keys(obj)
  return !keys.some(key => BLOCKED_FIELDS.includes(key))
}

/**
 * Strip blocked fields from an object
 */
export function stripBlockedFields<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (!BLOCKED_FIELDS.includes(key)) {
      (result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

// ============================================
// SELLER ACCESS CONTROL
// ============================================

/**
 * Check if a user has seller access to a deal
 */
export interface SellerAccessCheck {
  hasAccess: boolean
  role: 'owner' | 'manager' | 'viewer' | null
  error?: string
}

/**
 * Validate seller access to a deal.
 * In production, this would check user roles and permissions.
 */
export async function validateSellerAccess(
  userId: string,
  dealId: string
): Promise<SellerAccessCheck> {
  // TODO: Implement actual access control logic
  // For now, assume access is granted if userId and dealId are provided

  if (!userId || !dealId) {
    return {
      hasAccess: false,
      role: null,
      error: 'Missing user or deal ID',
    }
  }

  // In production:
  // 1. Check if user is associated with the company
  // 2. Check if user has seller role on this deal
  // 3. Return appropriate access level

  return {
    hasAccess: true,
    role: 'viewer',
  }
}
