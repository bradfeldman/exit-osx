/**
 * Section metadata builder — computes freshness and completeness for each section.
 *
 * This is used by API consumers to decide which sections need refreshing,
 * and by cache logic to determine if the intelligence profile is stale.
 */

import type {
  SectionMeta,
  IntelligenceSectionName,
  NAFlagsSection,
  DisclosuresSection,
  NotesSection,
} from './types'
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

// ─── Input: timestamps from the data layer ─────────────────────────────

export interface SectionTimestamps {
  /** When the dossier snapshot was last built */
  dossierUpdatedAt: string | null
  /** Most recent assessment response update */
  lastAssessmentResponseAt: string | null
  /** Most recent task completion */
  lastTaskCompletionAt: string | null
  /** Most recent document upload/update */
  lastDocumentUpdateAt: string | null
  /** Most recent signal creation */
  lastSignalAt: string | null
  /** Most recent weekly check-in completion */
  lastCheckInAt: string | null
  /** Most recent disclosure response */
  lastDisclosureAt: string | null
}

// ─── Completeness heuristics ───────────────────────────────────────────

export function computeIdentityCompleteness(section: IdentitySection): SectionMeta['completeness'] {
  if (!section.name) return 'none'
  if (!section.coreFactors) return 'minimal'
  if (!section.businessDescription) return 'partial'
  return 'complete'
}

export function computeAssessmentCompleteness(section: AssessmentSection): SectionMeta['completeness'] {
  if (!section.hasCompletedAssessment) return 'none'
  if (section.totalQuestionsAnswered < 10) return 'minimal'
  if (section.unansweredCategories.length > 0) return 'partial'
  return 'complete'
}

export function computeValuationCompleteness(section: ValuationSection): SectionMeta['completeness'] {
  if (section.currentValue === null) return 'none'
  if (section.trend.length < 2) return 'minimal'
  if (section.trend.length < 4) return 'partial'
  return 'complete'
}

export function computeTasksCompleteness(section: TasksSection): SectionMeta['completeness'] {
  if (section.totalTasks === 0) return 'none'
  if (section.completedCount === 0) return 'minimal'
  if (section.completedCount < 5) return 'partial'
  return 'complete'
}

export function computeEvidenceCompleteness(section: EvidenceSection): SectionMeta['completeness'] {
  if (section.totalDocuments === 0) return 'none'
  if (section.categoryGaps.length >= 4) return 'minimal'
  if (section.categoryGaps.length > 0) return 'partial'
  return 'complete'
}

export function computeSignalsCompleteness(section: SignalsSection): SectionMeta['completeness'] {
  // Signals are always "present" if we've checked — no signals is actually good
  if (section.openSignalsCount === 0 && section.recentValueMovements.length === 0) return 'minimal'
  return 'complete'
}

export function computeNAFlagsCompleteness(section: NAFlagsSection): SectionMeta['completeness'] {
  if (section.totalNACount === 0) return 'none'
  return 'complete'
}

export function computeDisclosuresCompleteness(section: DisclosuresSection): SectionMeta['completeness'] {
  if (section.totalCompleted === 0 && section.totalSkipped === 0) return 'none'
  if (section.totalCompleted === 0) return 'minimal'
  if (section.recentResponses.length < 5) return 'partial'
  return 'complete'
}

export function computeNotesCompleteness(section: NotesSection): SectionMeta['completeness'] {
  if (section.totalNotesCount === 0) return 'none'
  if (section.totalNotesCount < 3) return 'minimal'
  if (section.totalNotesCount < 10) return 'partial'
  return 'complete'
}

// ─── Build all section metadata ────────────────────────────────────────

export interface SectionDataForMeta {
  identity: IdentitySection
  financials: FinancialsSection
  assessment: AssessmentSection
  valuation: ValuationSection
  tasks: TasksSection
  evidence: EvidenceSection
  signals: SignalsSection
  engagement: EngagementSection
  aiContext: AIContextSection
  naFlags: NAFlagsSection
  disclosures: DisclosuresSection
  notes: NotesSection
}

/**
 * Build metadata for all intelligence sections.
 *
 * @param sections - All section data
 * @param timestamps - Timestamp data from the data layer
 */
export function buildSectionMeta(
  sections: SectionDataForMeta,
  timestamps: SectionTimestamps
): Record<IntelligenceSectionName, SectionMeta> {
  const dossierTs = timestamps.dossierUpdatedAt ?? new Date(0).toISOString()
  const now = new Date().toISOString()

  return {
    identity: {
      lastUpdatedAt: dossierTs,
      hasData: sections.identity.name !== '',
      completeness: computeIdentityCompleteness(sections.identity),
    },
    financials: {
      lastUpdatedAt: dossierTs,
      hasData: sections.financials.annualRevenue > 0 || sections.financials.annualEbitda > 0,
      completeness: sections.financials.dataCompleteness,
    },
    assessment: {
      lastUpdatedAt: timestamps.lastAssessmentResponseAt ?? dossierTs,
      hasData: sections.assessment.hasCompletedAssessment,
      completeness: computeAssessmentCompleteness(sections.assessment),
    },
    valuation: {
      lastUpdatedAt: dossierTs,
      hasData: sections.valuation.currentValue !== null,
      completeness: computeValuationCompleteness(sections.valuation),
    },
    tasks: {
      lastUpdatedAt: timestamps.lastTaskCompletionAt ?? dossierTs,
      hasData: sections.tasks.totalTasks > 0,
      completeness: computeTasksCompleteness(sections.tasks),
    },
    evidence: {
      lastUpdatedAt: timestamps.lastDocumentUpdateAt ?? dossierTs,
      hasData: sections.evidence.totalDocuments > 0,
      completeness: computeEvidenceCompleteness(sections.evidence),
    },
    signals: {
      lastUpdatedAt: timestamps.lastSignalAt ?? dossierTs,
      hasData: sections.signals.openSignalsCount > 0 || sections.signals.recentValueMovements.length > 0,
      completeness: computeSignalsCompleteness(sections.signals),
    },
    engagement: {
      lastUpdatedAt: timestamps.lastCheckInAt ?? dossierTs,
      hasData: sections.engagement.totalCheckIns > 0 || sections.engagement.daysSinceLastActivity < 999,
      completeness: sections.engagement.totalCheckIns >= 4 ? 'complete'
        : sections.engagement.totalCheckIns > 0 ? 'partial'
        : sections.engagement.daysSinceLastActivity < 999 ? 'minimal'
        : 'none',
    },
    aiContext: {
      lastUpdatedAt: dossierTs,
      hasData: sections.aiContext.focusAreas.length > 0 || sections.aiContext.identifiedRisks.length > 0,
      completeness: sections.aiContext.focusAreas.length > 0 ? 'complete' : 'minimal',
    },
    naFlags: {
      lastUpdatedAt: timestamps.lastAssessmentResponseAt ?? now,
      hasData: sections.naFlags.totalNACount > 0,
      completeness: computeNAFlagsCompleteness(sections.naFlags),
    },
    disclosures: {
      lastUpdatedAt: timestamps.lastDisclosureAt ?? now,
      hasData: sections.disclosures.totalCompleted > 0 || sections.disclosures.totalSkipped > 0,
      completeness: computeDisclosuresCompleteness(sections.disclosures),
    },
    notes: {
      lastUpdatedAt: now,
      hasData: sections.notes.totalNotesCount > 0,
      completeness: computeNotesCompleteness(sections.notes),
    },
  }
}
