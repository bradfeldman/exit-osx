/**
 * Contact System Library
 *
 * Centralized exports for the canonical contact management system.
 */

// ============================================
// IDENTITY RESOLUTION
// ============================================

export {
  // Types
  type MatchConfig,
  type MatchType,
  type MatchResult,
  type CompanyMatchInput,
  type PersonMatchInput,
  type DuplicatePair,
  type MergeResult,

  // Config
  DEFAULT_MATCH_CONFIG,

  // Normalization functions
  normalizeCompanyName,
  normalizePersonName,
  extractDomain,
  extractDomainFromUrl,
  stringSimilarity,

  // Matching functions
  findCompanyMatches,
  findPersonMatches,

  // Duplicate detection
  findDuplicateCompanies,
  findDuplicatePeople,

  // Merge operations
  mergeCompanies,
  mergePeople,
} from './identity-resolution'

// ============================================
// SMART PARSER
// ============================================

export {
  // Types
  type ParsedCompany,
  type ParsedPerson,
  type ParsedInput,

  // Parser functions
  parseInput,
  parseLinkedInUrl,
  parseVCard,
  parseBulkInput,
} from './smart-parser'

// ============================================
// DUPLICATE SERVICE
// ============================================

export {
  // Types
  type DuplicateDetectionResult,
  type AutoMergeConfig,
  type AutoMergeResult,

  // Batch operations
  runDuplicateDetection,
  runAutoMerge,
  cleanupStaleCandidates,
  getDuplicateStats,
} from './duplicate-service'

// ============================================
// CONSTANTS
// ============================================

export {
  // Thresholds
  MATCH_THRESHOLDS,
  MATCH_WEIGHTS,

  // Data quality
  DATA_QUALITY_LABELS,
  DATA_QUALITY_COLORS,

  // Buyer types
  BUYER_TYPE_LABELS,
  BUYER_TYPE_DESCRIPTIONS,

  // Approval status
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,

  // Buyer tiers
  BUYER_TIER_LABELS,
  BUYER_TIER_DESCRIPTIONS,

  // VDR access
  VDR_ACCESS_LABELS,
  STAGE_TO_VDR_ACCESS,

  // Activity types
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,

  // Contact roles
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_DESCRIPTIONS,

  // Deal status
  DEAL_STATUS_LABELS,
  DEAL_STATUS_COLORS,

  // Document types
  DEAL_DOCUMENT_TYPE_LABELS,

  // Meeting types
  MEETING_TYPE_LABELS,

  // Pagination
  PAGINATION,

  // Free email domains
  FREE_EMAIL_DOMAINS,
} from './constants'
