import { describe, it, expect } from 'vitest'
import {
  computeIdentityCompleteness,
  computeAssessmentCompleteness,
  computeValuationCompleteness,
  computeTasksCompleteness,
  computeEvidenceCompleteness,
  computeSignalsCompleteness,
  computeNAFlagsCompleteness,
  computeDisclosuresCompleteness,
  computeNotesCompleteness,
  buildSectionMeta,
  type SectionTimestamps,
  type SectionDataForMeta,
} from '../section-meta'
import type { IdentitySection, AssessmentSection, ValuationSection, TasksSection, EvidenceSection, SignalsSection, EngagementSection } from '@/lib/dossier/types'
import type { NAFlagsSection, DisclosuresSection, NotesSection } from '../types'

// ---------------------------------------------------------------------------
// computeIdentityCompleteness
// ---------------------------------------------------------------------------

describe('computeIdentityCompleteness', () => {
  it('returns "none" when name is empty', () => {
    expect(computeIdentityCompleteness({ name: '', industry: '', subSector: '', businessDescription: null, coreFactors: null })).toBe('none')
  })

  it('returns "minimal" when name exists but no core factors', () => {
    expect(computeIdentityCompleteness({ name: 'Acme', industry: 'Tech', subSector: 'SaaS', businessDescription: null, coreFactors: null })).toBe('minimal')
  })

  it('returns "partial" when core factors exist but no description', () => {
    expect(computeIdentityCompleteness({
      name: 'Acme', industry: 'Tech', subSector: 'SaaS', businessDescription: null,
      coreFactors: { revenueModel: 'RECURRING', ownerInvolvement: 'LOW', laborIntensity: 'LOW', assetIntensity: 'LOW', grossMarginProxy: 'HIGH', revenueSizeCategory: '1M_5M' },
    })).toBe('partial')
  })

  it('returns "complete" when all fields present', () => {
    expect(computeIdentityCompleteness({
      name: 'Acme', industry: 'Tech', subSector: 'SaaS', businessDescription: 'We build software',
      coreFactors: { revenueModel: 'RECURRING', ownerInvolvement: 'LOW', laborIntensity: 'LOW', assetIntensity: 'LOW', grossMarginProxy: 'HIGH', revenueSizeCategory: '1M_5M' },
    })).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// computeAssessmentCompleteness
// ---------------------------------------------------------------------------

describe('computeAssessmentCompleteness', () => {
  it('returns "none" when no assessment completed', () => {
    expect(computeAssessmentCompleteness({
      hasCompletedAssessment: false, lastAssessmentDate: null, categoryScores: {},
      weakestCategories: [], weakestDrivers: [], unansweredCategories: [],
      totalQuestionsAnswered: 0, totalQuestionsAvailable: 30,
    } as AssessmentSection)).toBe('none')
  })

  it('returns "minimal" when fewer than 10 questions answered', () => {
    expect(computeAssessmentCompleteness({
      hasCompletedAssessment: true, lastAssessmentDate: '2025-06-01',
      categoryScores: { FINANCIAL: 0.5 },
      weakestCategories: ['FINANCIAL'], weakestDrivers: [], unansweredCategories: ['MARKET'],
      totalQuestionsAnswered: 5, totalQuestionsAvailable: 30,
    } as AssessmentSection)).toBe('minimal')
  })

  it('returns "partial" when unanswered categories remain', () => {
    expect(computeAssessmentCompleteness({
      hasCompletedAssessment: true, lastAssessmentDate: '2025-06-01',
      categoryScores: { FINANCIAL: 0.7, OPERATIONAL: 0.6 },
      weakestCategories: [], weakestDrivers: [], unansweredCategories: ['PERSONAL'],
      totalQuestionsAnswered: 25, totalQuestionsAvailable: 30,
    } as AssessmentSection)).toBe('partial')
  })

  it('returns "complete" when all categories answered with 10+ questions', () => {
    expect(computeAssessmentCompleteness({
      hasCompletedAssessment: true, lastAssessmentDate: '2025-06-01',
      categoryScores: { FINANCIAL: 0.7, OPERATIONAL: 0.6 },
      weakestCategories: [], weakestDrivers: [], unansweredCategories: [],
      totalQuestionsAnswered: 30, totalQuestionsAvailable: 30,
    } as AssessmentSection)).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// computeValuationCompleteness
// ---------------------------------------------------------------------------

describe('computeValuationCompleteness', () => {
  it('returns "none" when no valuation', () => {
    expect(computeValuationCompleteness({
      currentValue: null, potentialValue: null, valueGap: null, briScore: null, finalMultiple: null, trend: [],
    })).toBe('none')
  })

  it('returns "minimal" with a single snapshot', () => {
    expect(computeValuationCompleteness({
      currentValue: 1000000, potentialValue: 2000000, valueGap: 1000000, briScore: 0.5, finalMultiple: 3.5,
      trend: [{ date: '2025-06-01', briScore: 0.5, currentValue: 1000000 }],
    })).toBe('minimal')
  })

  it('returns "partial" with 2-3 trend points', () => {
    expect(computeValuationCompleteness({
      currentValue: 1000000, potentialValue: 2000000, valueGap: 1000000, briScore: 0.5, finalMultiple: 3.5,
      trend: [
        { date: '2025-05-01', briScore: 0.4, currentValue: 900000 },
        { date: '2025-06-01', briScore: 0.5, currentValue: 1000000 },
        { date: '2025-07-01', briScore: 0.55, currentValue: 1100000 },
      ],
    })).toBe('partial')
  })

  it('returns "complete" with 4+ trend points', () => {
    expect(computeValuationCompleteness({
      currentValue: 1000000, potentialValue: 2000000, valueGap: 1000000, briScore: 0.5, finalMultiple: 3.5,
      trend: [
        { date: '2025-04-01', briScore: 0.3, currentValue: 800000 },
        { date: '2025-05-01', briScore: 0.4, currentValue: 900000 },
        { date: '2025-06-01', briScore: 0.5, currentValue: 1000000 },
        { date: '2025-07-01', briScore: 0.55, currentValue: 1100000 },
      ],
    })).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// computeTasksCompleteness
// ---------------------------------------------------------------------------

describe('computeTasksCompleteness', () => {
  it('returns "none" with no tasks', () => {
    expect(computeTasksCompleteness({ totalTasks: 0 } as TasksSection)).toBe('none')
  })

  it('returns "minimal" with tasks but none completed', () => {
    expect(computeTasksCompleteness({ totalTasks: 10, completedCount: 0 } as TasksSection)).toBe('minimal')
  })

  it('returns "partial" with fewer than 5 completions', () => {
    expect(computeTasksCompleteness({ totalTasks: 10, completedCount: 3 } as TasksSection)).toBe('partial')
  })

  it('returns "complete" with 5+ completions', () => {
    expect(computeTasksCompleteness({ totalTasks: 20, completedCount: 8 } as TasksSection)).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// computeEvidenceCompleteness
// ---------------------------------------------------------------------------

describe('computeEvidenceCompleteness', () => {
  it('returns "none" with no documents', () => {
    expect(computeEvidenceCompleteness({ totalDocuments: 0, categoryGaps: [] } as unknown as EvidenceSection)).toBe('none')
  })

  it('returns "minimal" with 4+ category gaps', () => {
    expect(computeEvidenceCompleteness({
      totalDocuments: 3, categoryGaps: ['FINANCIAL', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX'],
    } as unknown as EvidenceSection)).toBe('minimal')
  })

  it('returns "partial" with 1-3 category gaps', () => {
    expect(computeEvidenceCompleteness({
      totalDocuments: 10, categoryGaps: ['PERSONAL'],
    } as unknown as EvidenceSection)).toBe('partial')
  })

  it('returns "complete" with no category gaps', () => {
    expect(computeEvidenceCompleteness({
      totalDocuments: 20, categoryGaps: [],
    } as unknown as EvidenceSection)).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// computeSignalsCompleteness
// ---------------------------------------------------------------------------

describe('computeSignalsCompleteness', () => {
  it('returns "minimal" when no signals and no value movements', () => {
    expect(computeSignalsCompleteness({
      openSignalsCount: 0, severitySummary: {}, recentValueMovements: [], topOpenSignals: [],
    })).toBe('minimal')
  })

  it('returns "complete" when there are open signals', () => {
    expect(computeSignalsCompleteness({
      openSignalsCount: 3, severitySummary: { HIGH: 1, MEDIUM: 2 }, recentValueMovements: [], topOpenSignals: [],
    })).toBe('complete')
  })

  it('returns "complete" when there are value movements but no open signals', () => {
    expect(computeSignalsCompleteness({
      openSignalsCount: 0, severitySummary: {},
      recentValueMovements: [{ date: '2025-06-01', deltaValue: 10000, eventType: 'TASK_COMPLETED', narrativeSummary: null }],
      topOpenSignals: [],
    })).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// Supplemental section completeness
// ---------------------------------------------------------------------------

describe('computeNAFlagsCompleteness', () => {
  it('returns "none" when totalNACount is 0', () => {
    expect(computeNAFlagsCompleteness({ totalNACount: 0 } as NAFlagsSection)).toBe('none')
  })

  it('returns "complete" when any NA flags exist', () => {
    expect(computeNAFlagsCompleteness({ totalNACount: 3 } as NAFlagsSection)).toBe('complete')
  })
})

describe('computeDisclosuresCompleteness', () => {
  it('returns "none" when no prompt sets exist', () => {
    expect(computeDisclosuresCompleteness({
      totalCompleted: 0, totalSkipped: 0, recentResponses: [],
    } as unknown as DisclosuresSection)).toBe('none')
  })

  it('returns "minimal" when only skipped', () => {
    expect(computeDisclosuresCompleteness({
      totalCompleted: 0, totalSkipped: 3, recentResponses: [],
    } as unknown as DisclosuresSection)).toBe('minimal')
  })

  it('returns "partial" with fewer than 5 responses', () => {
    expect(computeDisclosuresCompleteness({
      totalCompleted: 2, totalSkipped: 0,
      recentResponses: [1, 2, 3], // mock array with length < 5
    } as unknown as DisclosuresSection)).toBe('partial')
  })

  it('returns "complete" with 5+ responses', () => {
    expect(computeDisclosuresCompleteness({
      totalCompleted: 5, totalSkipped: 0,
      recentResponses: [1, 2, 3, 4, 5], // mock array with length >= 5
    } as unknown as DisclosuresSection)).toBe('complete')
  })
})

describe('computeNotesCompleteness', () => {
  it('returns "none" when totalNotesCount is 0', () => {
    expect(computeNotesCompleteness({ totalNotesCount: 0 } as NotesSection)).toBe('none')
  })

  it('returns "minimal" when 1-2 notes', () => {
    expect(computeNotesCompleteness({ totalNotesCount: 2 } as NotesSection)).toBe('minimal')
  })

  it('returns "partial" when 3-9 notes', () => {
    expect(computeNotesCompleteness({ totalNotesCount: 7 } as NotesSection)).toBe('partial')
  })

  it('returns "complete" when 10+ notes', () => {
    expect(computeNotesCompleteness({ totalNotesCount: 15 } as NotesSection)).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// buildSectionMeta — integration-level test of metadata assembly
// ---------------------------------------------------------------------------

describe('buildSectionMeta', () => {
  function makeFullSections(): SectionDataForMeta {
    return {
      identity: { name: 'Acme', industry: 'Tech', subSector: 'SaaS', businessDescription: 'Software', coreFactors: { revenueModel: 'RECURRING', ownerInvolvement: 'LOW', laborIntensity: 'LOW', assetIntensity: 'LOW', grossMarginProxy: 'HIGH', revenueSizeCategory: '1M_5M' } },
      financials: { annualRevenue: 2000000, annualEbitda: 500000, ownerCompensation: 200000, revenueGrowthYoY: 0.15, ebitdaMarginPct: 0.25, periodsAvailable: 3, latestPeriodLabel: 'FY2024', balanceSheetHighlights: null, dataCompleteness: 'complete' },
      assessment: { hasCompletedAssessment: true, lastAssessmentDate: '2025-06-01', categoryScores: { FINANCIAL: 0.7 }, weakestCategories: ['PERSONAL'], weakestDrivers: [], unansweredCategories: [], totalQuestionsAnswered: 30, totalQuestionsAvailable: 30 },
      valuation: { currentValue: 2000000, potentialValue: 3500000, valueGap: 1500000, briScore: 0.65, finalMultiple: 4.0, trend: [{ date: '2025-05-01', briScore: 0.6, currentValue: 1800000 }, { date: '2025-06-01', briScore: 0.65, currentValue: 2000000 }] },
      tasks: { totalTasks: 25, pendingCount: 15, inProgressCount: 3, completedCount: 7, totalPendingValue: 500000, totalCompletedValue: 200000, valueByCategory: {}, topPendingTasks: [], recentCompletions: [], weeklyVelocity: 2 },
      evidence: { totalDocuments: 12, documentsByStatus: { CURRENT: 10, NEEDS_UPDATE: 2 }, categoryGaps: ['PERSONAL'], urgentDocuments: [] },
      signals: { openSignalsCount: 2, severitySummary: { MEDIUM: 2 }, recentValueMovements: [], topOpenSignals: [] },
      engagement: { lastCheckInDate: '2025-06-01', checkInStreak: 4, daysSinceLastActivity: 2, latestDriftReportSummary: null, totalCheckIns: 8 },
      aiContext: { previousQuestionIds: ['q1'], previousTaskTitles: ['Task 1'], identifiedRisks: ['Revenue concentration'], focusAreas: ['PERSONAL'] },
      naFlags: { assessmentNAFlags: [], taskNAFlags: [], heavilyNACategories: [], totalNACount: 0 },
      disclosures: { totalCompleted: 3, totalSkipped: 1, recentResponses: [{} as never, {} as never, {} as never], materialChanges: [], highChangeCategories: [] },
      notes: { assessmentNotes: [], taskCompletionNotes: [], checkInDetails: [], totalNotesCount: 5 },
    }
  }

  const timestamps: SectionTimestamps = {
    dossierUpdatedAt: '2025-06-01T12:00:00.000Z',
    lastAssessmentResponseAt: '2025-06-01T10:00:00.000Z',
    lastTaskCompletionAt: '2025-05-28T08:00:00.000Z',
    lastDocumentUpdateAt: '2025-05-30T14:00:00.000Z',
    lastSignalAt: '2025-06-01T11:00:00.000Z',
    lastCheckInAt: '2025-06-01T09:00:00.000Z',
    lastDisclosureAt: '2025-05-25T16:00:00.000Z',
  }

  it('returns metadata for all 12 sections', () => {
    const meta = buildSectionMeta(makeFullSections(), timestamps)
    const keys = Object.keys(meta)
    expect(keys).toContain('identity')
    expect(keys).toContain('financials')
    expect(keys).toContain('assessment')
    expect(keys).toContain('valuation')
    expect(keys).toContain('tasks')
    expect(keys).toContain('evidence')
    expect(keys).toContain('signals')
    expect(keys).toContain('engagement')
    expect(keys).toContain('aiContext')
    expect(keys).toContain('naFlags')
    expect(keys).toContain('disclosures')
    expect(keys).toContain('notes')
    expect(keys).toHaveLength(12)
  })

  it('sets hasData correctly per section', () => {
    const meta = buildSectionMeta(makeFullSections(), timestamps)
    expect(meta.identity.hasData).toBe(true)
    expect(meta.financials.hasData).toBe(true)
    expect(meta.assessment.hasData).toBe(true)
    expect(meta.valuation.hasData).toBe(true)
    expect(meta.tasks.hasData).toBe(true)
    expect(meta.evidence.hasData).toBe(true)
    expect(meta.signals.hasData).toBe(true)
    expect(meta.engagement.hasData).toBe(true)
  })

  it('uses timestamp overrides for sections that have them', () => {
    const meta = buildSectionMeta(makeFullSections(), timestamps)
    expect(meta.assessment.lastUpdatedAt).toBe('2025-06-01T10:00:00.000Z')
    expect(meta.tasks.lastUpdatedAt).toBe('2025-05-28T08:00:00.000Z')
    expect(meta.evidence.lastUpdatedAt).toBe('2025-05-30T14:00:00.000Z')
    expect(meta.signals.lastUpdatedAt).toBe('2025-06-01T11:00:00.000Z')
    expect(meta.engagement.lastUpdatedAt).toBe('2025-06-01T09:00:00.000Z')
  })

  it('falls back to dossier timestamp when section timestamp is null', () => {
    const nullTimestamps: SectionTimestamps = {
      dossierUpdatedAt: '2025-06-01T12:00:00.000Z',
      lastAssessmentResponseAt: null,
      lastTaskCompletionAt: null,
      lastDocumentUpdateAt: null,
      lastSignalAt: null,
      lastCheckInAt: null,
      lastDisclosureAt: null,
    }

    const meta = buildSectionMeta(makeFullSections(), nullTimestamps)
    expect(meta.assessment.lastUpdatedAt).toBe('2025-06-01T12:00:00.000Z')
    expect(meta.tasks.lastUpdatedAt).toBe('2025-06-01T12:00:00.000Z')
  })

  it('computes completeness correctly for identity section', () => {
    const meta = buildSectionMeta(makeFullSections(), timestamps)
    expect(meta.identity.completeness).toBe('complete')
  })

  it('computes financials completeness from the section field', () => {
    const meta = buildSectionMeta(makeFullSections(), timestamps)
    expect(meta.financials.completeness).toBe('complete')
  })

  it('computes engagement completeness based on check-in count', () => {
    const sections = makeFullSections()
    sections.engagement.totalCheckIns = 0
    sections.engagement.daysSinceLastActivity = 999
    const meta = buildSectionMeta(sections, timestamps)
    expect(meta.engagement.completeness).toBe('none')
  })
})
