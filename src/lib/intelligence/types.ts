/**
 * Company Intelligence Layer — Types
 *
 * PROD-024: Unified intelligence profile that aggregates all company learning.
 *
 * The intelligence layer extends the dossier's 9 sections with additional data
 * sources that the dossier doesn't capture: NA flags, disclosure responses,
 * task completion notes, weekly check-in details, and section-level metadata.
 *
 * Design decision: We WRAP the dossier, we don't rebuild it. The dossier
 * handles the 9 core sections. The intelligence layer adds supplemental
 * context that AI consumers (question generation, task generation, coach)
 * need but the dossier doesn't surface.
 */

import type {
  IdentitySection,
  FinancialsSection,
  AssessmentSection,
  ValuationSection,
  TasksSection,
  EvidenceSection,
  SignalsSection,
  EngagementSection,
  AIContextSection,
} from '@/lib/dossier/types'

// ─── Supplemental Sections (not in the dossier) ───────────────────────

/**
 * Captures what the company has explicitly marked as NOT_APPLICABLE.
 * This is critical context for AI: knowing what doesn't apply avoids
 * generating irrelevant questions or tasks.
 */
export interface NAFlagsSection {
  /** Assessment responses where confidenceLevel = NOT_APPLICABLE */
  assessmentNAFlags: Array<{
    questionId: string
    questionText: string
    briCategory: string
    /** When the NA flag was last set */
    flaggedAt: string
  }>
  /** Tasks with status = NOT_APPLICABLE */
  taskNAFlags: Array<{
    taskId: string
    taskTitle: string
    briCategory: string
  }>
  /** BRI categories with significant NA coverage (>50% of questions) */
  heavilyNACategories: string[]
  /** Total count of NA flags across all sources */
  totalNACount: number
}

/**
 * Disclosure responses from weekly/periodic check-ins.
 * These capture business changes the owner reported since last assessment.
 */
export interface DisclosuresSection {
  /** Total disclosure prompts completed */
  totalCompleted: number
  /** Total disclosure prompts skipped */
  totalSkipped: number
  /** Recent disclosure responses with answers */
  recentResponses: Array<{
    questionKey: string
    questionText: string
    briCategory: string
    answer: boolean
    followUpAnswer: string | null
    respondedAt: string
    signalCreated: boolean
  }>
  /** Disclosures that created signals (material changes) */
  materialChanges: Array<{
    questionText: string
    briCategory: string
    followUpAnswer: string | null
    respondedAt: string
  }>
  /** Categories with the most "yes" disclosures (change-heavy areas) */
  highChangeCategories: string[]
}

/**
 * Notes and qualitative data captured alongside quantitative scoring.
 * Task completion notes, assessment notes, and check-in commentary.
 */
export interface NotesSection {
  /** Notes attached to assessment responses */
  assessmentNotes: Array<{
    questionId: string
    questionText: string
    briCategory: string
    note: string
    updatedAt: string
  }>
  /** Completion notes on finished tasks */
  taskCompletionNotes: Array<{
    taskId: string
    taskTitle: string
    briCategory: string
    completionNotes: string
    completedAt: string
  }>
  /** Weekly check-in detail (team/customer changes, confidence) */
  checkInDetails: Array<{
    weekOf: string
    teamChanges: boolean | null
    teamChangesNote: string | null
    customerChanges: boolean | null
    customerChangesNote: string | null
    confidenceRating: number | null
    additionalNotes: string | null
    completedAt: string
  }>
  /** Total count of qualitative notes across all sources */
  totalNotesCount: number
}

// ─── Section Metadata ──────────────────────────────────────────────────

export interface SectionMeta {
  /** ISO timestamp of when this section's data was last modified */
  lastUpdatedAt: string
  /** Whether this section has any data at all */
  hasData: boolean
  /** Data completeness as a rough indicator */
  completeness: 'none' | 'minimal' | 'partial' | 'complete'
}

// ─── Composite Intelligence Profile ────────────────────────────────────

export interface CompanyIntelligence {
  /** Company ID this profile belongs to */
  companyId: string
  /** When this intelligence profile was built */
  generatedAt: string

  /** Dossier-sourced sections (pulled from the persisted dossier snapshot) */
  identity: IdentitySection
  financials: FinancialsSection
  assessment: AssessmentSection
  valuation: ValuationSection
  tasks: TasksSection
  evidence: EvidenceSection
  signals: SignalsSection
  engagement: EngagementSection
  aiContext: AIContextSection

  /** Supplemental sections (computed on-demand, not persisted) */
  naFlags: NAFlagsSection
  disclosures: DisclosuresSection
  notes: NotesSection

  /** Per-section metadata for cache/freshness decisions */
  sectionMeta: Record<IntelligenceSectionName, SectionMeta>
}

/**
 * All section names available in the intelligence profile.
 * The first 9 come from the dossier; the last 3 are supplemental.
 */
export type IntelligenceSectionName =
  | 'identity'
  | 'financials'
  | 'assessment'
  | 'valuation'
  | 'tasks'
  | 'evidence'
  | 'signals'
  | 'engagement'
  | 'aiContext'
  | 'naFlags'
  | 'disclosures'
  | 'notes'

export const ALL_INTELLIGENCE_SECTIONS: IntelligenceSectionName[] = [
  'identity',
  'financials',
  'assessment',
  'valuation',
  'tasks',
  'evidence',
  'signals',
  'engagement',
  'aiContext',
  'naFlags',
  'disclosures',
  'notes',
]

export const DOSSIER_SECTIONS: IntelligenceSectionName[] = [
  'identity',
  'financials',
  'assessment',
  'valuation',
  'tasks',
  'evidence',
  'signals',
  'engagement',
  'aiContext',
]

export const SUPPLEMENTAL_SECTIONS: IntelligenceSectionName[] = [
  'naFlags',
  'disclosures',
  'notes',
]

/**
 * Valid section name check — used at API boundary
 */
export function isValidSectionName(name: string): name is IntelligenceSectionName {
  return ALL_INTELLIGENCE_SECTIONS.includes(name as IntelligenceSectionName)
}
