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

export const BUYER_TYPE_LABELS = {
  STRATEGIC: 'Strategic',
  FINANCIAL: 'Financial',
  OTHER: 'Hybrid / Other',
} as const

export const BUYER_TYPE_DESCRIPTIONS = {
  STRATEGIC: 'Corporate acquirer looking for synergies',
  FINANCIAL: 'PE firm or financial sponsor',
  OTHER: 'Hybrid buyer or other type',
} as const

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
 */
export const STAGE_TO_VDR_ACCESS = {
  // Early stages - no access
  IDENTIFIED: 'NONE',
  RESEARCHING: 'NONE',
  INITIAL_OUTREACH: 'NONE',
  FOLLOW_UP: 'NONE',

  // Post-teaser - teaser access
  TEASER_SENT: 'TEASER',
  REVIEWING_TEASER: 'TEASER',

  // NDA stage - still teaser
  NDA_SENT: 'TEASER',
  NDA_IN_NEGOTIATION: 'TEASER',

  // Post-NDA - CIM access
  NDA_EXECUTED: 'POST_NDA',
  CIM_SENT: 'POST_NDA',
  CIM_REVIEWING: 'POST_NDA',

  // IOI stage - Level 2
  IOI_EXPECTED: 'LEVEL_2',
  IOI_RECEIVED: 'LEVEL_2',
  IOI_UNDER_REVIEW: 'LEVEL_2',

  // Management meeting
  MGMT_MEETING_SCHEDULED: 'LEVEL_2',
  MGMT_MEETING_COMPLETED: 'LEVEL_2',

  // LOI stage - Level 3
  LOI_REQUESTED: 'LEVEL_3',
  LOI_RECEIVED: 'LEVEL_3',
  LOI_UNDER_NEGOTIATION: 'LEVEL_3',
  LOI_SIGNED: 'LEVEL_3',

  // Due diligence - Full
  DUE_DILIGENCE: 'FULL',
  DEFINITIVE_AGREEMENT: 'FULL',

  // Terminal stages
  CLOSED: 'FULL',
  PASSED: 'NONE',
  DECLINED: 'NONE',
  DISQUALIFIED: 'NONE',
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
