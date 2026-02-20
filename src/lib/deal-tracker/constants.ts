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
  [DealStage.IDENTIFIED]: { bg: 'bg-secondary', text: 'text-foreground', border: 'border-border' },
  [DealStage.SELLER_REVIEWING]: { bg: 'bg-orange-light', text: 'text-orange-dark', border: 'border-orange/30' },
  [DealStage.APPROVED]: { bg: 'bg-green-light', text: 'text-green-dark', border: 'border-green/30' },
  [DealStage.DECLINED]: { bg: 'bg-red-light', text: 'text-red-dark', border: 'border-red/30' },
  // Marketing - Blue
  [DealStage.TEASER_SENT]: { bg: 'bg-accent-light', text: 'text-primary', border: 'border-primary/30' },
  [DealStage.INTERESTED]: { bg: 'bg-primary/20', text: 'text-primary', border: 'border-primary/40' },
  [DealStage.PASSED]: { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-border' },
  // NDA - Indigo
  [DealStage.NDA_SENT]: { bg: 'bg-accent-light', text: 'text-primary', border: 'border-primary/30' },
  [DealStage.NDA_NEGOTIATING]: { bg: 'bg-primary/20', text: 'text-primary', border: 'border-primary/40' },
  [DealStage.NDA_EXECUTED]: { bg: 'bg-primary/30', text: 'text-primary', border: 'border-primary' },
  // Diligence - Purple
  [DealStage.CIM_ACCESS]: { bg: 'bg-purple-light', text: 'text-purple-dark', border: 'border-purple/30' },
  [DealStage.LEVEL_2_ACCESS]: { bg: 'bg-purple/20', text: 'text-purple-dark', border: 'border-purple/40' },
  [DealStage.LEVEL_3_ACCESS]: { bg: 'bg-purple/30', text: 'text-purple-dark', border: 'border-purple' },
  // Management - Violet
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: { bg: 'bg-purple-light', text: 'text-purple-dark', border: 'border-purple/30' },
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: { bg: 'bg-purple/20', text: 'text-purple-dark', border: 'border-purple/40' },
  // IOI - Cyan
  [DealStage.IOI_REQUESTED]: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30' },
  [DealStage.IOI_RECEIVED]: { bg: 'bg-teal/20', text: 'text-teal', border: 'border-teal/40' },
  [DealStage.IOI_ACCEPTED]: { bg: 'bg-teal/30', text: 'text-teal', border: 'border-teal' },
  [DealStage.IOI_DECLINED]: { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-border' },
  // LOI - Teal
  [DealStage.LOI_REQUESTED]: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30' },
  [DealStage.LOI_RECEIVED]: { bg: 'bg-teal/20', text: 'text-teal', border: 'border-teal/40' },
  [DealStage.LOI_SELECTED]: { bg: 'bg-teal/30', text: 'text-teal', border: 'border-teal' },
  [DealStage.LOI_BACKUP]: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30' },
  // Close - Emerald/Green
  [DealStage.DUE_DILIGENCE]: { bg: 'bg-green-light', text: 'text-green-dark', border: 'border-green/30' },
  [DealStage.PA_DRAFTING]: { bg: 'bg-green/20', text: 'text-green-dark', border: 'border-green/40' },
  [DealStage.PA_NEGOTIATING]: { bg: 'bg-green/30', text: 'text-green-dark', border: 'border-green' },
  [DealStage.CLOSING]: { bg: 'bg-green/20', text: 'text-green-dark', border: 'border-green/40' },
  [DealStage.CLOSED]: { bg: 'bg-green', text: 'text-white', border: 'border-green-dark' },
  // Exit - Gray/Red
  [DealStage.WITHDRAWN]: { bg: 'bg-muted', text: 'text-foreground', border: 'border-muted-foreground' },
  [DealStage.TERMINATED]: { bg: 'bg-red/20', text: 'text-red-dark', border: 'border-red/40' },
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
  [BuyerType.STRATEGIC]: { bg: 'bg-accent-light', text: 'text-primary' },
  [BuyerType.FINANCIAL]: { bg: 'bg-purple-light', text: 'text-purple-dark' },
  [BuyerType.INDIVIDUAL]: { bg: 'bg-orange-light', text: 'text-orange-dark' },
  [BuyerType.MANAGEMENT]: { bg: 'bg-green-light', text: 'text-green-dark' },
  [BuyerType.ESOP]: { bg: 'bg-teal/10', text: 'text-teal' },
  [BuyerType.OTHER]: { bg: 'bg-secondary', text: 'text-foreground' },
}

// Buyer tier labels and colors
export const BUYER_TIER_LABELS: Record<BuyerTier, string> = {
  [BuyerTier.A_TIER]: 'A Tier',
  [BuyerTier.B_TIER]: 'B Tier',
  [BuyerTier.C_TIER]: 'C Tier',
  [BuyerTier.D_TIER]: 'D Tier',
}

export const BUYER_TIER_COLORS: Record<BuyerTier, { bg: string; text: string }> = {
  [BuyerTier.A_TIER]: { bg: 'bg-green-light', text: 'text-green-dark' },
  [BuyerTier.B_TIER]: { bg: 'bg-accent-light', text: 'text-primary' },
  [BuyerTier.C_TIER]: { bg: 'bg-orange-light', text: 'text-orange-dark' },
  [BuyerTier.D_TIER]: { bg: 'bg-secondary', text: 'text-foreground' },
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
    if ((group.stages as readonly DealStage[]).includes(stage)) {
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
  [ProspectApprovalStatus.UNDECIDED]: { bg: 'bg-secondary', text: 'text-foreground', border: 'border-border' },
  [ProspectApprovalStatus.APPROVED]: { bg: 'bg-green-light', text: 'text-green-dark', border: 'border-green/30' },
  [ProspectApprovalStatus.DENIED]: { bg: 'bg-red-light', text: 'text-red-dark', border: 'border-red/30' },
}

// Simplified buyer type for prospects (Strategic, Financial, Hybrid/Other)
export const PROSPECT_BUYER_TYPE_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  FINANCIAL: 'Financial',
  OTHER: 'Hybrid',
}

export const PROSPECT_BUYER_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  STRATEGIC: { bg: 'bg-accent-light', text: 'text-primary' },
  FINANCIAL: { bg: 'bg-purple-light', text: 'text-purple-dark' },
  OTHER: { bg: 'bg-orange-light', text: 'text-orange-dark' },
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
