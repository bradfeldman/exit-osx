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
  DATA_QUALITY_BADGE_CLASSES,

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

// ============================================
// STAGE SERVICE
// ============================================

export {
  // Stage transition rules
  VALID_STAGE_TRANSITIONS,
  TERMINAL_STAGES,
  EXIT_STAGES,
  STAGE_LABELS,

  // Types
  type StageTransitionInput,
  type StageTransitionResult,

  // Validation
  isValidTransition,
  getValidNextStages,
  isTerminalStage,
  isExitStage,

  // Stage operations
  transitionStage,
  bulkTransitionStage,

  // VDR sync
  syncVDRAccessForBuyer,
  revokeVDRAccessForBuyer,

  // Analytics
  getStageHistory,
  getTimeInStages,
} from './stage-service'

// ============================================
// SELLER PROJECTION
// ============================================

export {
  // Types
  type SellerBuyerView,
  type SellerDealSummary,
  type SellerAccessCheck,

  // Sanitization
  sanitizeBuyerForSeller,
  sanitizeBuyersForSeller,
  createSellerDealSummary,

  // Validation
  validateNoBlockedFields,
  stripBlockedFields,

  // Access control
  validateSellerAccess,
} from './seller-projection'

// ============================================
// NOTIFICATIONS
// ============================================

export {
  // Types
  type NotificationType,
  type NotificationPayload,
  type NotificationResult,

  // Send functions
  sendNotification,
  notifyApprovalChange,
  notifyBuyerAdded,
  notifyStageChange,
  notifyVDRAccessGranted,

  // Templates
  EMAIL_TEMPLATES,
  renderEmailTemplate,
} from './notifications'

// ============================================
// MIGRATION
// ============================================

export {
  // Types
  type MigrationOptions,
  type MigrationProgress,
  type MigrationResult,
  type MigrationSummary,
  type MigrationError,
  type ValidationResult,
  type ValidationIssue,
  type CSVBuyerRow,

  // Migration helpers
  ensureCanonicalCompany,
  ensureCanonicalPerson,
  ensureDealBuyer,

  // Migration functions
  runFullMigration,
  importBuyersFromCSV,

  // Validation
  validateMigrationReadiness,

  // Rollback
  rollbackMigration,
} from './migration'
