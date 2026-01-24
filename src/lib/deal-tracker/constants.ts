import { DealStage, BuyerType, BuyerTier, BuyerContactRole, DealDocumentType, MeetingType, ProspectApprovalStatus } from '@prisma/client'

// Stage groups for organizing the pipeline
export const STAGE_GROUPS = {
  IDENTIFICATION: {
    label: 'Identification',
    stages: [
      DealStage.IDENTIFIED,
      DealStage.SELLER_REVIEWING,
      DealStage.APPROVED,
      DealStage.DECLINED,
    ],
  },
  MARKETING: {
    label: 'Marketing',
    stages: [
      DealStage.TEASER_SENT,
      DealStage.INTERESTED,
      DealStage.PASSED,
    ],
  },
  NDA: {
    label: 'NDA',
    stages: [
      DealStage.NDA_SENT,
      DealStage.NDA_NEGOTIATING,
      DealStage.NDA_EXECUTED,
    ],
  },
  DILIGENCE: {
    label: 'Diligence',
    stages: [
      DealStage.CIM_ACCESS,
      DealStage.LEVEL_2_ACCESS,
      DealStage.LEVEL_3_ACCESS,
    ],
  },
  MANAGEMENT: {
    label: 'Management',
    stages: [
      DealStage.MANAGEMENT_MEETING_SCHEDULED,
      DealStage.MANAGEMENT_MEETING_COMPLETED,
    ],
  },
  IOI: {
    label: 'IOI',
    stages: [
      DealStage.IOI_REQUESTED,
      DealStage.IOI_RECEIVED,
      DealStage.IOI_ACCEPTED,
      DealStage.IOI_DECLINED,
    ],
  },
  LOI: {
    label: 'LOI',
    stages: [
      DealStage.LOI_REQUESTED,
      DealStage.LOI_RECEIVED,
      DealStage.LOI_SELECTED,
      DealStage.LOI_BACKUP,
    ],
  },
  CLOSE: {
    label: 'Close',
    stages: [
      DealStage.DUE_DILIGENCE,
      DealStage.PA_DRAFTING,
      DealStage.PA_NEGOTIATING,
      DealStage.CLOSING,
      DealStage.CLOSED,
    ],
  },
  EXIT: {
    label: 'Exit',
    stages: [
      DealStage.WITHDRAWN,
      DealStage.TERMINATED,
    ],
  },
} as const

// Stage labels for display
export const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.IDENTIFIED]: 'Identified',
  [DealStage.SELLER_REVIEWING]: 'Seller Reviewing',
  [DealStage.APPROVED]: 'Approved',
  [DealStage.DECLINED]: 'Declined',
  [DealStage.TEASER_SENT]: 'Teaser Sent',
  [DealStage.INTERESTED]: 'Interested',
  [DealStage.PASSED]: 'Passed',
  [DealStage.NDA_SENT]: 'NDA Sent',
  [DealStage.NDA_NEGOTIATING]: 'NDA Negotiating',
  [DealStage.NDA_EXECUTED]: 'NDA Executed',
  [DealStage.CIM_ACCESS]: 'CIM Access',
  [DealStage.LEVEL_2_ACCESS]: 'Level 2 Access',
  [DealStage.LEVEL_3_ACCESS]: 'Level 3 Access',
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: 'Mgmt Meeting Scheduled',
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: 'Mgmt Meeting Completed',
  [DealStage.IOI_REQUESTED]: 'IOI Requested',
  [DealStage.IOI_RECEIVED]: 'IOI Received',
  [DealStage.IOI_ACCEPTED]: 'IOI Accepted',
  [DealStage.IOI_DECLINED]: 'IOI Declined',
  [DealStage.LOI_REQUESTED]: 'LOI Requested',
  [DealStage.LOI_RECEIVED]: 'LOI Received',
  [DealStage.LOI_SELECTED]: 'LOI Selected',
  [DealStage.LOI_BACKUP]: 'LOI Backup',
  [DealStage.DUE_DILIGENCE]: 'Due Diligence',
  [DealStage.PA_DRAFTING]: 'PA Drafting',
  [DealStage.PA_NEGOTIATING]: 'PA Negotiating',
  [DealStage.CLOSING]: 'Closing',
  [DealStage.CLOSED]: 'Closed',
  [DealStage.WITHDRAWN]: 'Withdrawn',
  [DealStage.TERMINATED]: 'Terminated',
}

// Stage colors for UI
export const STAGE_COLORS: Record<DealStage, { bg: string; text: string; border: string }> = {
  // Identification - Gray/Slate
  [DealStage.IDENTIFIED]: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  [DealStage.SELLER_REVIEWING]: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  [DealStage.APPROVED]: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  [DealStage.DECLINED]: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  // Marketing - Blue
  [DealStage.TEASER_SENT]: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  [DealStage.INTERESTED]: { bg: 'bg-blue-200', text: 'text-blue-800', border: 'border-blue-400' },
  [DealStage.PASSED]: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  // NDA - Indigo
  [DealStage.NDA_SENT]: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  [DealStage.NDA_NEGOTIATING]: { bg: 'bg-indigo-200', text: 'text-indigo-800', border: 'border-indigo-400' },
  [DealStage.NDA_EXECUTED]: { bg: 'bg-indigo-300', text: 'text-indigo-900', border: 'border-indigo-500' },
  // Diligence - Purple
  [DealStage.CIM_ACCESS]: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  [DealStage.LEVEL_2_ACCESS]: { bg: 'bg-purple-200', text: 'text-purple-800', border: 'border-purple-400' },
  [DealStage.LEVEL_3_ACCESS]: { bg: 'bg-purple-300', text: 'text-purple-900', border: 'border-purple-500' },
  // Management - Violet
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: { bg: 'bg-violet-200', text: 'text-violet-800', border: 'border-violet-400' },
  // IOI - Cyan
  [DealStage.IOI_REQUESTED]: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  [DealStage.IOI_RECEIVED]: { bg: 'bg-cyan-200', text: 'text-cyan-800', border: 'border-cyan-400' },
  [DealStage.IOI_ACCEPTED]: { bg: 'bg-cyan-300', text: 'text-cyan-900', border: 'border-cyan-500' },
  [DealStage.IOI_DECLINED]: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  // LOI - Teal
  [DealStage.LOI_REQUESTED]: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  [DealStage.LOI_RECEIVED]: { bg: 'bg-teal-200', text: 'text-teal-800', border: 'border-teal-400' },
  [DealStage.LOI_SELECTED]: { bg: 'bg-teal-300', text: 'text-teal-900', border: 'border-teal-500' },
  [DealStage.LOI_BACKUP]: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-300' },
  // Close - Emerald/Green
  [DealStage.DUE_DILIGENCE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  [DealStage.PA_DRAFTING]: { bg: 'bg-emerald-200', text: 'text-emerald-800', border: 'border-emerald-400' },
  [DealStage.PA_NEGOTIATING]: { bg: 'bg-emerald-300', text: 'text-emerald-900', border: 'border-emerald-500' },
  [DealStage.CLOSING]: { bg: 'bg-green-200', text: 'text-green-800', border: 'border-green-400' },
  [DealStage.CLOSED]: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  // Exit - Gray/Red
  [DealStage.WITHDRAWN]: { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-400' },
  [DealStage.TERMINATED]: { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-400' },
}

// Buyer type labels
export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  [BuyerType.STRATEGIC]: 'Strategic',
  [BuyerType.FINANCIAL]: 'Financial',
  [BuyerType.INDIVIDUAL]: 'Individual',
  [BuyerType.MANAGEMENT]: 'Management',
  [BuyerType.ESOP]: 'ESOP',
  [BuyerType.OTHER]: 'Other',
}

// Buyer type colors
export const BUYER_TYPE_COLORS: Record<BuyerType, { bg: string; text: string }> = {
  [BuyerType.STRATEGIC]: { bg: 'bg-blue-100', text: 'text-blue-700' },
  [BuyerType.FINANCIAL]: { bg: 'bg-purple-100', text: 'text-purple-700' },
  [BuyerType.INDIVIDUAL]: { bg: 'bg-amber-100', text: 'text-amber-700' },
  [BuyerType.MANAGEMENT]: { bg: 'bg-green-100', text: 'text-green-700' },
  [BuyerType.ESOP]: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  [BuyerType.OTHER]: { bg: 'bg-gray-100', text: 'text-gray-700' },
}

// Buyer tier labels and colors
export const BUYER_TIER_LABELS: Record<BuyerTier, string> = {
  [BuyerTier.A_TIER]: 'A Tier',
  [BuyerTier.B_TIER]: 'B Tier',
  [BuyerTier.C_TIER]: 'C Tier',
  [BuyerTier.D_TIER]: 'D Tier',
}

export const BUYER_TIER_COLORS: Record<BuyerTier, { bg: string; text: string }> = {
  [BuyerTier.A_TIER]: { bg: 'bg-green-100', text: 'text-green-700' },
  [BuyerTier.B_TIER]: { bg: 'bg-blue-100', text: 'text-blue-700' },
  [BuyerTier.C_TIER]: { bg: 'bg-amber-100', text: 'text-amber-700' },
  [BuyerTier.D_TIER]: { bg: 'bg-gray-100', text: 'text-gray-700' },
}

// Contact role labels
export const CONTACT_ROLE_LABELS: Record<BuyerContactRole, string> = {
  [BuyerContactRole.PRIMARY]: 'Primary Contact',
  [BuyerContactRole.DECISION_MAKER]: 'Decision Maker',
  [BuyerContactRole.DEAL_LEAD]: 'Deal Lead',
  [BuyerContactRole.DILIGENCE]: 'Diligence',
  [BuyerContactRole.LEGAL]: 'Legal',
  [BuyerContactRole.FINANCE]: 'Finance',
  [BuyerContactRole.OPERATIONS]: 'Operations',
}

// Document type labels
export const DOCUMENT_TYPE_LABELS: Record<DealDocumentType, string> = {
  [DealDocumentType.TEASER]: 'Teaser',
  [DealDocumentType.NDA_TEMPLATE]: 'NDA Template',
  [DealDocumentType.NDA_SIGNED]: 'Signed NDA',
  [DealDocumentType.CIM]: 'CIM',
  [DealDocumentType.PROCESS_LETTER]: 'Process Letter',
  [DealDocumentType.IOI_RECEIVED]: 'IOI Received',
  [DealDocumentType.LOI_RECEIVED]: 'LOI Received',
  [DealDocumentType.PURCHASE_AGREEMENT]: 'Purchase Agreement',
  [DealDocumentType.OTHER]: 'Other',
}

// Meeting type labels
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  [MeetingType.INTRO_CALL]: 'Intro Call',
  [MeetingType.MANAGEMENT_PRESENTATION]: 'Management Presentation',
  [MeetingType.SITE_VISIT]: 'Site Visit',
  [MeetingType.EXPERT_SESSION]: 'Expert Session',
  [MeetingType.NEGOTIATION]: 'Negotiation',
  [MeetingType.OTHER]: 'Other',
}

// Stages that indicate an active/in-progress buyer
export const ACTIVE_STAGES: DealStage[] = [
  DealStage.IDENTIFIED,
  DealStage.SELLER_REVIEWING,
  DealStage.APPROVED,
  DealStage.TEASER_SENT,
  DealStage.INTERESTED,
  DealStage.NDA_SENT,
  DealStage.NDA_NEGOTIATING,
  DealStage.NDA_EXECUTED,
  DealStage.CIM_ACCESS,
  DealStage.LEVEL_2_ACCESS,
  DealStage.LEVEL_3_ACCESS,
  DealStage.MANAGEMENT_MEETING_SCHEDULED,
  DealStage.MANAGEMENT_MEETING_COMPLETED,
  DealStage.IOI_REQUESTED,
  DealStage.IOI_RECEIVED,
  DealStage.IOI_ACCEPTED,
  DealStage.LOI_REQUESTED,
  DealStage.LOI_RECEIVED,
  DealStage.LOI_SELECTED,
  DealStage.LOI_BACKUP,
  DealStage.DUE_DILIGENCE,
  DealStage.PA_DRAFTING,
  DealStage.PA_NEGOTIATING,
  DealStage.CLOSING,
]

// Stages that indicate a terminated buyer (exited the process)
export const TERMINATED_STAGES: DealStage[] = [
  DealStage.DECLINED,
  DealStage.PASSED,
  DealStage.IOI_DECLINED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
]

// Stages that indicate a completed buyer (deal closed)
export const COMPLETED_STAGES: DealStage[] = [
  DealStage.CLOSED,
]

// Pipeline view stages (subset for kanban board)
export const PIPELINE_STAGES: DealStage[] = [
  DealStage.IDENTIFIED,
  DealStage.TEASER_SENT,
  DealStage.NDA_EXECUTED,
  DealStage.CIM_ACCESS,
  DealStage.IOI_RECEIVED,
  DealStage.LOI_RECEIVED,
  DealStage.DUE_DILIGENCE,
  DealStage.CLOSING,
]

// Valid stage transitions - defines what stages can move to what
export const VALID_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.IDENTIFIED]: [DealStage.SELLER_REVIEWING, DealStage.WITHDRAWN],
  [DealStage.SELLER_REVIEWING]: [DealStage.APPROVED, DealStage.DECLINED],
  [DealStage.APPROVED]: [DealStage.TEASER_SENT, DealStage.WITHDRAWN],
  [DealStage.DECLINED]: [], // Terminal
  [DealStage.TEASER_SENT]: [DealStage.INTERESTED, DealStage.PASSED, DealStage.WITHDRAWN],
  [DealStage.INTERESTED]: [DealStage.NDA_SENT, DealStage.WITHDRAWN],
  [DealStage.PASSED]: [], // Terminal
  [DealStage.NDA_SENT]: [DealStage.NDA_NEGOTIATING, DealStage.NDA_EXECUTED, DealStage.WITHDRAWN],
  [DealStage.NDA_NEGOTIATING]: [DealStage.NDA_EXECUTED, DealStage.WITHDRAWN],
  [DealStage.NDA_EXECUTED]: [DealStage.CIM_ACCESS, DealStage.WITHDRAWN],
  [DealStage.CIM_ACCESS]: [DealStage.LEVEL_2_ACCESS, DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.LEVEL_2_ACCESS]: [DealStage.LEVEL_3_ACCESS, DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.LEVEL_3_ACCESS]: [DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: [DealStage.MANAGEMENT_MEETING_COMPLETED, DealStage.WITHDRAWN],
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: [DealStage.IOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.IOI_REQUESTED]: [DealStage.IOI_RECEIVED, DealStage.WITHDRAWN],
  [DealStage.IOI_RECEIVED]: [DealStage.IOI_ACCEPTED, DealStage.IOI_DECLINED],
  [DealStage.IOI_ACCEPTED]: [DealStage.LOI_REQUESTED, DealStage.WITHDRAWN],
  [DealStage.IOI_DECLINED]: [], // Terminal
  [DealStage.LOI_REQUESTED]: [DealStage.LOI_RECEIVED, DealStage.WITHDRAWN],
  [DealStage.LOI_RECEIVED]: [DealStage.LOI_SELECTED, DealStage.LOI_BACKUP, DealStage.WITHDRAWN],
  [DealStage.LOI_SELECTED]: [DealStage.DUE_DILIGENCE, DealStage.WITHDRAWN],
  [DealStage.LOI_BACKUP]: [DealStage.LOI_SELECTED, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.DUE_DILIGENCE]: [DealStage.PA_DRAFTING, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.PA_DRAFTING]: [DealStage.PA_NEGOTIATING, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.PA_NEGOTIATING]: [DealStage.CLOSING, DealStage.WITHDRAWN, DealStage.TERMINATED],
  [DealStage.CLOSING]: [DealStage.CLOSED, DealStage.TERMINATED],
  [DealStage.CLOSED]: [], // Terminal
  [DealStage.WITHDRAWN]: [], // Terminal
  [DealStage.TERMINATED]: [], // Terminal
}

// Get the group for a given stage
export function getStageGroup(stage: DealStage): string {
  for (const [groupKey, group] of Object.entries(STAGE_GROUPS)) {
    if (group.stages.includes(stage)) {
      return groupKey
    }
  }
  return 'UNKNOWN'
}

// Check if a stage transition is valid
export function isValidTransition(fromStage: DealStage, toStage: DealStage): boolean {
  return VALID_STAGE_TRANSITIONS[fromStage]?.includes(toStage) ?? false
}

// Activity type constants
export const ACTIVITY_TYPES = {
  STAGE_CHANGED: 'STAGE_CHANGED',
  CONTACT_ADDED: 'CONTACT_ADDED',
  CONTACT_REMOVED: 'CONTACT_REMOVED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_SENT: 'DOCUMENT_SENT',
  DOCUMENT_RECEIVED: 'DOCUMENT_RECEIVED',
  MEETING_SCHEDULED: 'MEETING_SCHEDULED',
  MEETING_COMPLETED: 'MEETING_COMPLETED',
  MEETING_CANCELLED: 'MEETING_CANCELLED',
  VDR_ACCESS_GRANTED: 'VDR_ACCESS_GRANTED',
  VDR_ACCESS_REVOKED: 'VDR_ACCESS_REVOKED',
  NOTE_ADDED: 'NOTE_ADDED',
  IOI_SUBMITTED: 'IOI_SUBMITTED',
  LOI_SUBMITTED: 'LOI_SUBMITTED',
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED: 'APPROVAL_GRANTED',
  APPROVAL_DENIED: 'APPROVAL_DENIED',
} as const

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES]

// ============================================
// PROSPECT BUYER LIST CONSTANTS
// ============================================

// Prospect approval status labels
export const PROSPECT_STATUS_LABELS: Record<ProspectApprovalStatus, string> = {
  [ProspectApprovalStatus.UNDECIDED]: 'Undecided',
  [ProspectApprovalStatus.APPROVED]: 'Approved',
  [ProspectApprovalStatus.DENIED]: 'Denied',
}

// Prospect approval status colors
export const PROSPECT_STATUS_COLORS: Record<ProspectApprovalStatus, { bg: string; text: string; border: string }> = {
  [ProspectApprovalStatus.UNDECIDED]: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  [ProspectApprovalStatus.APPROVED]: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  [ProspectApprovalStatus.DENIED]: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
}

// Simplified buyer type for prospects (Strategic, Financial, Hybrid/Other)
export const PROSPECT_BUYER_TYPE_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  FINANCIAL: 'Financial',
  OTHER: 'Hybrid',
}

export const PROSPECT_BUYER_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  STRATEGIC: { bg: 'bg-blue-100', text: 'text-blue-700' },
  FINANCIAL: { bg: 'bg-purple-100', text: 'text-purple-700' },
  OTHER: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

// CSV template headers
export const PROSPECT_CSV_HEADERS = [
  'company_name',
  'buyer_type',
  'relevance_description',
  'website',
  'headquarters_location',
] as const

// CSV template example row
export const PROSPECT_CSV_EXAMPLE = `company_name,buyer_type,relevance_description,website,headquarters_location
"Acme Corporation",strategic,"Direct competitor with complementary product line",www.acme.com,"New York, NY"
"Vista Equity Partners",financial,"Portfolio includes 3 companies in our space",www.vistaequity.com,"Austin, TX"
"TechGrowth Holdings",hybrid,"Strategic operator with PE backing",www.techgrowth.com,"San Francisco, CA"`
