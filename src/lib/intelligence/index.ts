/**
 * Company Intelligence Layer — Public API
 *
 * PROD-024: Unified intelligence profile for AI consumers.
 *
 * Usage:
 *   import { buildCompanyIntelligence } from '@/lib/intelligence'
 *   const intel = await buildCompanyIntelligence(companyId)
 *
 * For individual sections:
 *   import { buildIntelligenceSection } from '@/lib/intelligence'
 *   const naFlags = await buildIntelligenceSection(companyId, 'naFlags')
 */

// Main orchestrator
export {
  buildCompanyIntelligence,
  buildIntelligenceSection,
} from './company-intelligence'

// Types
export type {
  CompanyIntelligence,
  IntelligenceSectionName,
  SectionMeta,
  NAFlagsSection,
  DisclosuresSection,
  NotesSection,
} from './types'

export {
  ALL_INTELLIGENCE_SECTIONS,
  DOSSIER_SECTIONS,
  SUPPLEMENTAL_SECTIONS,
  isValidSectionName,
} from './types'

// Pure aggregation functions (for testing and direct use)
export { aggregateNAFlags, computeCategoryBreakdown } from './aggregate-na-flags'
export { aggregateDisclosures, computeHighChangeCategories } from './aggregate-disclosures'
export { aggregateNotes, hasQualitativeContent } from './aggregate-notes'
export { buildSectionMeta } from './section-meta'
