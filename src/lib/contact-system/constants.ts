/**
 * Contact System Constants
 *
 * Centralized configuration for the contact system.
 */

// ============================================
// IDENTITY RESOLUTION
// ============================================

/**
 * Confidence thresholds for identity matching.
 */
export const MATCH_THRESHOLDS = {
  AUTO_LINK: 0.95,      // Auto-merge without user intervention
  SUGGEST: 0.70,        // Suggest to user for confirmation
  PROVISIONAL: 0.50,    // Save as provisional, flag for review
} as const

/**
 * Matching signal weights.
 */
export const MATCH_WEIGHTS = {
  DOMAIN_EXACT: 0.95,
  EMAIL_EXACT: 0.99,
  LINKEDIN_EXACT: 0.90,
  NAME_EXACT: 0.85,
  NAME_COMPANY: 0.85,
  NAME_DOMAIN: 0.80,
  NAME_FUZZY_MULTIPLIER: 0.75,
  NAME_ONLY: 0.50,
} as const

// ============================================
// DATA QUALITY
// ============================================

export const DATA_QUALITY_LABELS = {
  PROVISIONAL: 'Provisional',
  SUGGESTED: 'Suggested Match',
  VERIFIED: 'Verified',
  ENRICHED: 'Enriched',
} as const

export const DATA_QUALITY_COLORS = {
  PROVISIONAL: 'gray',
  SUGGESTED: 'yellow',
  VERIFIED: 'green',
  ENRICHED: 'blue',
} as const

// ============================================
// BUYER TYPES
// ============================================

export const BUYER_TYPE_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  FINANCIAL: 'Financial',
  INDIVIDUAL: 'Individual',
  MANAGEMENT: 'Management',
  ESOP: 'ESOP',
  OTHER: 'Hybrid / Other',
}

export const BUYER_TYPE_DESCRIPTIONS: Record<string, string> = {
  STRATEGIC: 'Corporate acquirer looking for synergies',
  FINANCIAL: 'PE firm or financial sponsor',
  INDIVIDUAL: 'Individual investor or family office',
  MANAGEMENT: 'Management buyout team',
  ESOP: 'Employee Stock Ownership Plan',
  OTHER: 'Hybrid buyer or other type',
}

// ============================================
// APPROVAL STATUS
// ============================================

export const APPROVAL_STATUS_LABELS = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  HOLD: 'On Hold',
  DENIED: 'Denied',
} as const

export const APPROVAL_STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  HOLD: 'orange',
  DENIED: 'red',
} as const

// ============================================
// BUYER TIERS
// ============================================

export const BUYER_TIER_LABELS = {
  A_TIER: 'A-Tier',
  B_TIER: 'B-Tier',
  C_TIER: 'C-Tier',
} as const

export const BUYER_TIER_DESCRIPTIONS = {
  A_TIER: 'Highest priority - most likely to close',
  B_TIER: 'Good prospect - worth pursuing',
  C_TIER: 'Lower priority - opportunistic',
} as const

// ============================================
// VDR ACCESS LEVELS
// ============================================

export const VDR_ACCESS_LABELS = {
  NONE: 'No Access',
  TEASER: 'Teaser Only',
  POST_NDA: 'Post-NDA',
  LEVEL_2: 'Level 2 (IOI)',
  LEVEL_3: 'Level 3 (LOI)',
  FULL: 'Full Access',
} as const

/**
 * Map deal stages to VDR access levels.
 * Used to auto-sync access when stage changes.
 * Maps to DealStage enum values in prisma schema.
 */
export const STAGE_TO_VDR_ACCESS = {
  // Early stages - no access
  IDENTIFIED: 'NONE',
  SELLER_REVIEWING: 'NONE',
  APPROVED: 'NONE',
  DECLINED: 'NONE',

  // Post-teaser - teaser access
  TEASER_SENT: 'TEASER',
  INTERESTED: 'TEASER',
  PASSED: 'NONE',

  // NDA stage - still teaser until executed
  NDA_SENT: 'TEASER',
  NDA_NEGOTIATING: 'TEASER',

  // Post-NDA - CIM access
  NDA_EXECUTED: 'POST_NDA',
  CIM_ACCESS: 'POST_NDA',

  // Level 2 and 3 access stages
  LEVEL_2_ACCESS: 'LEVEL_2',
  LEVEL_3_ACCESS: 'LEVEL_3',

  // Management meetings
  MANAGEMENT_MEETING_SCHEDULED: 'LEVEL_2',
  MANAGEMENT_MEETING_COMPLETED: 'LEVEL_2',

  // IOI stage - Level 2
  IOI_REQUESTED: 'LEVEL_2',
  IOI_RECEIVED: 'LEVEL_2',
  IOI_ACCEPTED: 'LEVEL_2',
  IOI_DECLINED: 'NONE',

  // LOI stage - Level 3
  LOI_REQUESTED: 'LEVEL_3',
  LOI_RECEIVED: 'LEVEL_3',
  LOI_SELECTED: 'LEVEL_3',
  LOI_BACKUP: 'LEVEL_3',

  // Due diligence and closing - Full access
  DUE_DILIGENCE: 'FULL',
  PA_DRAFTING: 'FULL',
  PA_NEGOTIATING: 'FULL',
  CLOSING: 'FULL',
  CLOSED: 'FULL',

  // Exit stages - revoke access
  WITHDRAWN: 'NONE',
  TERMINATED: 'NONE',
} as const

// ============================================
// ACTIVITY TYPES
// ============================================

export const ACTIVITY_TYPE_LABELS = {
  EMAIL_SENT: 'Email Sent',
  EMAIL_RECEIVED: 'Email Received',
  CALL_OUTBOUND: 'Outbound Call',
  CALL_INBOUND: 'Inbound Call',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  MEETING_COMPLETED: 'Meeting Completed',
  MEETING_CANCELLED: 'Meeting Cancelled',
  NOTE_ADDED: 'Note Added',
  STAGE_CHANGED: 'Stage Changed',
  DOCUMENT_SENT: 'Document Sent',
  DOCUMENT_RECEIVED: 'Document Received',
  VDR_ACCESS_GRANTED: 'VDR Access Granted',
  VDR_ACCESS_REVOKED: 'VDR Access Revoked',
  APPROVAL_REQUESTED: 'Approval Requested',
  APPROVAL_GRANTED: 'Approval Granted',
  APPROVAL_DENIED: 'Approval Denied',
} as const

export const ACTIVITY_TYPE_ICONS = {
  EMAIL_SENT: 'mail',
  EMAIL_RECEIVED: 'mail-open',
  CALL_OUTBOUND: 'phone-outgoing',
  CALL_INBOUND: 'phone-incoming',
  MEETING_SCHEDULED: 'calendar',
  MEETING_COMPLETED: 'calendar-check',
  MEETING_CANCELLED: 'calendar-x',
  NOTE_ADDED: 'file-text',
  STAGE_CHANGED: 'arrow-right',
  DOCUMENT_SENT: 'file-up',
  DOCUMENT_RECEIVED: 'file-down',
  VDR_ACCESS_GRANTED: 'key',
  VDR_ACCESS_REVOKED: 'key-off',
  APPROVAL_REQUESTED: 'clock',
  APPROVAL_GRANTED: 'check-circle',
  APPROVAL_DENIED: 'x-circle',
} as const

// ============================================
// CONTACT ROLES
// ============================================

export const CONTACT_ROLE_LABELS = {
  DEAL_LEAD: 'Deal Lead',
  DECISION_MAKER: 'Decision Maker',
  INFLUENCER: 'Influencer',
  TECHNICAL: 'Technical Contact',
  LEGAL: 'Legal Contact',
  OTHER: 'Other',
} as const

export const CONTACT_ROLE_DESCRIPTIONS = {
  DEAL_LEAD: 'Primary point of contact for the deal',
  DECISION_MAKER: 'Has authority to approve the transaction',
  INFLUENCER: 'Key influencer in the decision process',
  TECHNICAL: 'Technical due diligence contact',
  LEGAL: 'Legal/compliance contact',
  OTHER: 'Other role',
} as const

// ============================================
// DEAL STATUS
// ============================================

export const DEAL_STATUS_LABELS = {
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  TERMINATED: 'Terminated',
  ON_HOLD: 'On Hold',
} as const

export const DEAL_STATUS_COLORS = {
  ACTIVE: 'green',
  CLOSED: 'blue',
  TERMINATED: 'red',
  ON_HOLD: 'yellow',
} as const

// ============================================
// DOCUMENT TYPES
// ============================================

export const DEAL_DOCUMENT_TYPE_LABELS = {
  NDA: 'NDA',
  TEASER: 'Teaser',
  CIM: 'CIM',
  IOI: 'IOI',
  LOI: 'LOI',
  DD_REQUEST: 'DD Request List',
  DD_RESPONSE: 'DD Response',
  DEFINITIVE_AGREEMENT: 'Definitive Agreement',
  OTHER: 'Other',
} as const

// ============================================
// MEETING TYPES
// ============================================

export const MEETING_TYPE_LABELS = {
  INTRO_CALL: 'Intro Call',
  MANAGEMENT_PRESENTATION: 'Management Presentation',
  SITE_VISIT: 'Site Visit',
  DD_SESSION: 'Due Diligence Session',
  NEGOTIATION: 'Negotiation',
  OTHER: 'Other',
} as const

// ============================================
// PAGINATION DEFAULTS
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
} as const

// ============================================
// COMMON FREE EMAIL DOMAINS
// ============================================
// Used to detect personal vs. business emails

// ============================================
// PARTICIPANT SIDES
// ============================================

export const PARTICIPANT_SIDE_LABELS = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  NEUTRAL: 'Neutral',
} as const

export const PARTICIPANT_SIDE_COLORS = {
  BUYER: 'blue',
  SELLER: 'green',
  NEUTRAL: 'gray',
} as const

// ============================================
// PARTICIPANT ROLES
// ============================================

export const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  // Buyer roles
  DEAL_LEAD: 'Deal Lead',
  DECISION_MAKER: 'Decision Maker',
  DILIGENCE: 'Diligence',
  BUYER_LEGAL: 'Legal',
  BUYER_FINANCE: 'Finance',
  BUYER_OPERATIONS: 'Operations',
  // Advisory (seller-side)
  CPA: 'CPA',
  ATTORNEY: 'Attorney',
  BROKER: 'Broker',
  MA_ADVISOR: 'M&A Advisor',
  WEALTH_PLANNER: 'Wealth Planner',
  // Internal (seller-side)
  COO: 'COO',
  CFO: 'CFO',
  GM: 'General Manager',
  KEY_EMPLOYEE: 'Key Employee',
  BOARD_MEMBER: 'Board Member',
  // External (neutral)
  BANKER: 'Banker',
  ESCROW_AGENT: 'Escrow Agent',
  INSURANCE_BROKER: 'Insurance Broker',
  // Generic
  PRIMARY_CONTACT: 'Primary Contact',
  OTHER: 'Other',
}

export const ROLES_BY_SIDE: Record<string, string[]> = {
  BUYER: ['DEAL_LEAD', 'DECISION_MAKER', 'DILIGENCE', 'BUYER_LEGAL', 'BUYER_FINANCE', 'BUYER_OPERATIONS', 'PRIMARY_CONTACT', 'OTHER'],
  SELLER: ['CPA', 'ATTORNEY', 'BROKER', 'MA_ADVISOR', 'WEALTH_PLANNER', 'COO', 'CFO', 'GM', 'KEY_EMPLOYEE', 'BOARD_MEMBER', 'PRIMARY_CONTACT', 'OTHER'],
  NEUTRAL: ['BANKER', 'ESCROW_AGENT', 'INSURANCE_BROKER', 'PRIMARY_CONTACT', 'OTHER'],
}

/**
 * Infer a ParticipantRole from a parsed job title string.
 */
export function inferRoleFromTitle(title: string): string | null {
  const t = title.toLowerCase().trim()

  // CPA / Accountant
  if (t.includes('cpa') || t.includes('certified public accountant') || t.includes('accountant')) return 'CPA'
  // Attorney / Lawyer
  if (t.includes('attorney') || t.includes('lawyer') || t.includes('counsel') || t.includes('legal')) return 'ATTORNEY'
  // Broker / M&A
  if (t.includes('m&a') || t.includes('mergers') || t.includes('investment banker')) return 'MA_ADVISOR'
  if (t.includes('broker') && !t.includes('insurance')) return 'BROKER'
  // Insurance
  if (t.includes('insurance')) return 'INSURANCE_BROKER'
  // Wealth
  if (t.includes('wealth') || t.includes('financial planner') || t.includes('financial advisor')) return 'WEALTH_PLANNER'
  // C-suite
  if (t.includes('cfo') || t.includes('chief financial officer')) return 'CFO'
  if (t.includes('coo') || t.includes('chief operating officer')) return 'COO'
  if (t.includes('general manager') || t === 'gm') return 'GM'
  // Board
  if (t.includes('board member') || t.includes('board of directors')) return 'BOARD_MEMBER'
  // Buyer-side
  if (t.includes('deal lead') || t.includes('managing director')) return 'DEAL_LEAD'
  if (t.includes('diligence') || t.includes('due diligence')) return 'DILIGENCE'
  // Escrow
  if (t.includes('escrow')) return 'ESCROW_AGENT'
  // Banker
  if (t.includes('banker')) return 'BANKER'
  // VP / Decision maker
  if (t.includes('vp') || t.includes('vice president') || t.includes('ceo') || t.includes('president') || t.includes('owner')) return 'DECISION_MAKER'

  return null
}

// ============================================
// COMMON FREE EMAIL DOMAINS
// ============================================
// Used to detect personal vs. business emails

export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
])
