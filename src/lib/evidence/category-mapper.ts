import { type EvidenceCategory } from './evidence-categories'

/**
 * Map BRI category to evidence category
 */
const BRI_TO_EVIDENCE: Record<string, EvidenceCategory> = {
  FINANCIAL: 'financial',
  TRANSFERABILITY: 'operational',
  OPERATIONAL: 'operational',
  MARKET: 'customers',
  LEGAL_TAX: 'legal',
  PERSONAL: 'operational',
}

/**
 * Map DataRoomCategory enum to evidence category
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
  OTHER: 'operational',
}

export function mapBriCategoryToEvidence(briCategory: string): EvidenceCategory {
  return BRI_TO_EVIDENCE[briCategory] ?? 'operational'
}

export function mapDataRoomCategoryToEvidence(dataRoomCategory: string): EvidenceCategory {
  return DATA_ROOM_TO_EVIDENCE[dataRoomCategory] ?? 'operational'
}
