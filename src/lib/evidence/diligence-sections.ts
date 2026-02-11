import { type EvidenceCategory } from './evidence-categories'

/**
 * Buyer-facing diligence sections for data room organization.
 *
 * These 5 sections represent how buyers and their advisors organize
 * due diligence workstreams. Documents from the 6 evidence categories
 * map into these sections.
 *
 * Mapping rationale:
 *   Financial   -> Financial       (direct)
 *   Legal       -> Legal           (direct)
 *   Operational -> Operations      (direct)
 *   Customers   -> Commercial      (customer = commercial diligence)
 *   Team        -> HR              (direct)
 *   IP/Tech     -> Operations      (tech DD is part of ops in most deals)
 */

export type DiligenceSection = 'financial' | 'legal' | 'operations' | 'hr' | 'commercial'

export interface DiligenceSectionConfig {
  id: DiligenceSection
  label: string
  description: string
  evidenceCategories: EvidenceCategory[]
  sortOrder: number
}

export const DILIGENCE_SECTIONS: DiligenceSectionConfig[] = [
  {
    id: 'financial',
    label: 'Financial',
    description: 'Financial statements, tax returns, projections, and debt obligations',
    evidenceCategories: ['financial'],
    sortOrder: 1,
  },
  {
    id: 'legal',
    label: 'Legal',
    description: 'Formation documents, contracts, litigation, insurance, and licenses',
    evidenceCategories: ['legal'],
    sortOrder: 2,
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Organization, processes, vendor relationships, facilities, and technology',
    evidenceCategories: ['operational', 'ipTech'],
    sortOrder: 3,
  },
  {
    id: 'hr',
    label: 'HR',
    description: 'Employee agreements, compensation, benefits, and workforce data',
    evidenceCategories: ['team'],
    sortOrder: 4,
  },
  {
    id: 'commercial',
    label: 'Commercial',
    description: 'Customer relationships, revenue concentration, pipeline, and contracts',
    evidenceCategories: ['customers'],
    sortOrder: 5,
  },
]

export const DILIGENCE_SECTION_MAP: Record<DiligenceSection, DiligenceSectionConfig> =
  Object.fromEntries(DILIGENCE_SECTIONS.map(s => [s.id, s])) as Record<DiligenceSection, DiligenceSectionConfig>

/**
 * Map an evidence category to its buyer-facing diligence section.
 */
export function mapEvidenceToDiligence(evidenceCategory: EvidenceCategory): DiligenceSection {
  for (const section of DILIGENCE_SECTIONS) {
    if (section.evidenceCategories.includes(evidenceCategory)) {
      return section.id
    }
  }
  return 'operations' // fallback
}

/**
 * Get all evidence categories that belong to a diligence section.
 */
export function getEvidenceCategoriesForSection(section: DiligenceSection): EvidenceCategory[] {
  return DILIGENCE_SECTION_MAP[section]?.evidenceCategories ?? []
}
