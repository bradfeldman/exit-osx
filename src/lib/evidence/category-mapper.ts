import { type EvidenceCategory } from './evidence-categories'

/**
 * PROD-040: Evidence-to-BRI Category Mapping
 *
 * Evidence categories are buyer-facing diligence categories.
 * BRI categories are internal scoring dimensions.
 * These are intentionally different because buyers and our scoring model
 * organize the world differently.
 *
 * Mapping rationale (BRI -> Evidence):
 *
 *   FINANCIAL      -> financial    Direct: financial health = financial docs
 *   TRANSFERABILITY-> team         Transfer risk is primarily about people --
 *                                  key employee agreements, non-competes,
 *                                  succession documentation. Previously mapped
 *                                  to 'operational' which diluted the signal.
 *   OPERATIONAL    -> operational  Direct: operational efficiency = ops docs
 *   MARKET         -> customers    Market position is evidenced through customer
 *                                  data, concentration analysis, pipeline.
 *   LEGAL_TAX      -> legal        Direct: legal/tax compliance = legal docs
 *   PERSONAL       -> team         Personal readiness overlaps with team --
 *                                  owner involvement, succession plans,
 *                                  key employee dependencies. Previously mapped
 *                                  to 'operational' which was inaccurate.
 */
const BRI_TO_EVIDENCE: Record<string, EvidenceCategory> = {
  FINANCIAL: 'financial',
  TRANSFERABILITY: 'team',
  OPERATIONAL: 'operational',
  MARKET: 'customers',
  LEGAL_TAX: 'legal',
  PERSONAL: 'team',
}

/**
 * Map DataRoomCategory enum to evidence category.
 *
 * The DataRoomCategory enum has 15 values representing granular data room
 * folders. These roll up into our 6 evidence categories for scoring.
 */
const DATA_ROOM_TO_EVIDENCE: Record<string, EvidenceCategory> = {
  FINANCIAL: 'financial',
  TAX: 'financial',
  LEGAL: 'legal',
  CORPORATE: 'legal',
  INSURANCE: 'legal',
  OPERATIONS: 'operational',
  REAL_ESTATE: 'operational',
  ENVIRONMENTAL: 'operational',
  CUSTOMERS: 'customers',
  SALES_MARKETING: 'customers',
  EMPLOYEES: 'team',
  IP: 'ipTech',
  TECHNOLOGY: 'ipTech',
  TASK_PROOF: 'operational', // fallback, should be resolved via briCategory
  CUSTOM: 'operational',
}

export function mapBriCategoryToEvidence(briCategory: string): EvidenceCategory {
  return BRI_TO_EVIDENCE[briCategory] ?? 'operational'
}

export function mapDataRoomCategoryToEvidence(dataRoomCategory: string): EvidenceCategory {
  return DATA_ROOM_TO_EVIDENCE[dataRoomCategory] ?? 'operational'
}
