/**
 * Type definitions for Deal components
 */

import { DealStage, DealStatus, ApprovalStatus, BuyerTier, BuyerType } from '@prisma/client'

export interface Deal {
  id: string
  codeName: string
  description: string | null
  status: DealStatus
  targetCloseDate: string | null
  requireSellerApproval: boolean
  createdAt: string
  closedAt: string | null
  terminatedAt: string | null
  company: {
    id: string
    name: string
  }
  _count: {
    buyers: number
  }
}

export interface DealWithAnalytics extends Deal {
  buyers: DealBuyer[]
  activities: DealActivity[]
  analytics: {
    stageDistribution: Array<{ currentStage: DealStage; _count: number }>
    approvalDistribution: Array<{ approvalStatus: ApprovalStatus; _count: number }>
  }
}

export interface DealBuyer {
  id: string
  dealId: string
  currentStage: DealStage
  stageUpdatedAt: string
  approvalStatus: ApprovalStatus
  approvalNote: string | null
  tier: BuyerTier
  buyerRationale: string | null
  teaserSentAt: string | null
  ndaExecutedAt: string | null
  cimAccessAt: string | null
  ioiReceivedAt: string | null
  loiReceivedAt: string | null
  closedAt: string | null
  exitedAt: string | null
  exitReason: string | null
  ioiAmount: number | null
  loiAmount: number | null
  internalNotes: string | null
  createdAt: string
  canonicalCompany: {
    id: string
    name: string
    companyType: BuyerType
    website: string | null
    linkedInUrl: string | null
    description?: string | null
    dataQuality?: string
  }
  contacts: DealContact[]
  _count: {
    activities: number
    stageHistory: number
    contacts: number
  }
}

export interface DealContact {
  id: string
  isPrimary: boolean
  role: string
  isActive: boolean
  vdrAccessLevel: string | null
  canonicalPerson: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    currentTitle: string | null
    linkedInUrl: string | null
  }
  dataRoomAccess?: {
    id: string
    maxStage: string
    accessLevel: string
  } | null
}

export interface DealActivity {
  id: string
  activityType: string
  subject: string
  description: string | null
  performedAt: string
  metadata: Record<string, unknown> | null
}

export interface StageHistoryEntry {
  id: string
  fromStage: DealStage | null
  fromStageLabel: string | null
  toStage: DealStage
  toStageLabel: string
  note: string | null
  changedAt: string
  changedByUserId: string
}

export interface ValidStageOption {
  stage: DealStage
  label: string
}

export interface DealListResponse {
  deals: Deal[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  summary: {
    active: number
    closed: number
    terminated: number
    onHold: number
  }
}

export interface DealBuyersResponse {
  buyers: DealBuyer[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  analytics: {
    stageDistribution: Array<{ currentStage: DealStage; _count: number }>
    approvalDistribution: Array<{ approvalStatus: ApprovalStatus; _count: number }>
  }
}
