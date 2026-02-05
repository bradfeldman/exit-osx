export type EvidenceCategory = 'financial' | 'legal' | 'operational' | 'customers' | 'team' | 'ipTech'

export interface EvidenceCategoryConfig {
  id: EvidenceCategory
  label: string
  weight: number
  buyerImpact: 'critical' | 'important' | 'moderate'
}

export const EVIDENCE_CATEGORIES: EvidenceCategoryConfig[] = [
  { id: 'financial', label: 'Financial', weight: 0.30, buyerImpact: 'critical' },
  { id: 'legal', label: 'Legal', weight: 0.20, buyerImpact: 'critical' },
  { id: 'operational', label: 'Operations', weight: 0.15, buyerImpact: 'important' },
  { id: 'customers', label: 'Customers', weight: 0.15, buyerImpact: 'important' },
  { id: 'team', label: 'Team/HR', weight: 0.10, buyerImpact: 'moderate' },
  { id: 'ipTech', label: 'IP/Tech', weight: 0.10, buyerImpact: 'moderate' },
]

export const EVIDENCE_CATEGORY_MAP: Record<EvidenceCategory, EvidenceCategoryConfig> =
  Object.fromEntries(EVIDENCE_CATEGORIES.map(c => [c.id, c])) as Record<EvidenceCategory, EvidenceCategoryConfig>
