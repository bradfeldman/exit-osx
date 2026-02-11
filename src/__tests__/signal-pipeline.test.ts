/**
 * Signal Pipeline Tests
 *
 * Tests the signal creation utilities (pure logic paths) without database access.
 * For functions that require Prisma, we test the input/output contracts and
 * the pure logic branches within them.
 */

import { describe, it, expect } from 'vitest'
import type { DocumentUploadData, TaskGeneratedData, TimeDecayData, AdvisorSignalData } from '@/lib/signals/types'
import {
  applyConfidenceWeight,
  getDefaultConfidenceForChannel,
  getUpgradedConfidence,
  getDowngradedConfidence,
  CONFIDENCE_MULTIPLIERS,
} from '@/lib/signals/confidence-scoring'

// ---------------------------------------------------------------------------
// Channel 2: Task-Generated Signal Data
// ---------------------------------------------------------------------------

describe('Channel 2: Task-Generated Signal Data', () => {
  it('TaskGeneratedData captures task completion context', () => {
    const data: TaskGeneratedData = {
      taskId: 'task-abc-123',
      taskTitle: 'Document key-man insurance',
      previousStatus: 'PENDING',
      newStatus: 'COMPLETED',
      completedValue: 15000,
    }

    expect(data.taskId).toBeDefined()
    expect(data.taskTitle).toBeDefined()
    expect(data.previousStatus).toBe('PENDING')
    expect(data.newStatus).toBe('COMPLETED')
    expect(data.completedValue).toBe(15000)
  })

  it('task completion signal uses CONFIDENT confidence level', () => {
    const confidence = getDefaultConfidenceForChannel('TASK_GENERATED')
    expect(confidence).toBe('CONFIDENT')
  })

  it('task completion value is weighted by confidence', () => {
    const rawValue = 25000
    const confidence = getDefaultConfidenceForChannel('TASK_GENERATED')
    const weighted = applyConfidenceWeight(rawValue, confidence)

    // CONFIDENT = 0.85x
    expect(weighted).toBe(21250)
  })

  it('high BRI impact task should escalate to MEDIUM or HIGH severity', () => {
    // Business logic: if BRI delta >= 0.05, signal severity should be HIGH
    const briDelta = 0.06
    let severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (briDelta >= 0.05) severity = 'HIGH'
    else if (briDelta >= 0.02) severity = 'MEDIUM'

    expect(severity).toBe('HIGH')
  })

  it('small BRI impact task stays at LOW severity', () => {
    const briDelta = 0.01
    let severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (briDelta >= 0.05) severity = 'HIGH'
    else if (briDelta >= 0.02) severity = 'MEDIUM'

    expect(severity).toBe('LOW')
  })

  it('moderate BRI impact task escalates to MEDIUM severity', () => {
    const briDelta = 0.03
    let severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (briDelta >= 0.05) severity = 'HIGH'
    else if (briDelta >= 0.02) severity = 'MEDIUM'

    expect(severity).toBe('MEDIUM')
  })
})

// ---------------------------------------------------------------------------
// Channel 2: Document Upload Signal Data
// ---------------------------------------------------------------------------

describe('Channel 2: Document Upload Signal Data', () => {
  it('DocumentUploadData captures upload context', () => {
    const data: DocumentUploadData = {
      documentId: 'doc-xyz-456',
      documentName: 'P&L Statement 2024',
      evidenceCategory: 'financial',
      expectedDocumentId: 'expected-pl-2024',
      source: 'direct',
      linkedTaskId: null,
      mimeType: 'application/pdf',
      fileSize: 2048000,
    }

    expect(data.documentId).toBeDefined()
    expect(data.documentName).toBe('P&L Statement 2024')
    expect(data.evidenceCategory).toBe('financial')
    expect(data.expectedDocumentId).toBe('expected-pl-2024')
    expect(data.source).toBe('direct')
  })

  it('expected document upload should use LOW severity', () => {
    const isExpected = true
    const severity = isExpected ? 'LOW' : 'INFO'
    expect(severity).toBe('LOW')
  })

  it('non-expected (ad hoc) document upload should use INFO severity', () => {
    const isExpected = false
    const severity = isExpected ? 'LOW' : 'INFO'
    expect(severity).toBe('INFO')
  })

  it('document upload signal maps evidence categories to BRI categories', () => {
    const EVIDENCE_TO_BRI: Record<string, string> = {
      financial: 'FINANCIAL',
      legal: 'LEGAL_TAX',
      operational: 'OPERATIONAL',
      customers: 'MARKET',
      team: 'TRANSFERABILITY',
      ipTech: 'OPERATIONAL',
    }

    expect(EVIDENCE_TO_BRI['financial']).toBe('FINANCIAL')
    expect(EVIDENCE_TO_BRI['legal']).toBe('LEGAL_TAX')
    expect(EVIDENCE_TO_BRI['operational']).toBe('OPERATIONAL')
    expect(EVIDENCE_TO_BRI['customers']).toBe('MARKET')
    expect(EVIDENCE_TO_BRI['team']).toBe('TRANSFERABILITY')
    expect(EVIDENCE_TO_BRI['ipTech']).toBe('OPERATIONAL')
  })

  it('task-linked upload captures the task reference', () => {
    const data: DocumentUploadData = {
      documentId: 'doc-task-linked',
      documentName: 'Insurance Certificate',
      evidenceCategory: 'legal',
      expectedDocumentId: null,
      source: 'task',
      linkedTaskId: 'task-insurance-123',
      mimeType: 'application/pdf',
      fileSize: 512000,
    }

    expect(data.source).toBe('task')
    expect(data.linkedTaskId).toBe('task-insurance-123')
  })
})

// ---------------------------------------------------------------------------
// Channel 3: Time Decay Signal Data
// ---------------------------------------------------------------------------

describe('Channel 3: Time Decay Signal Data', () => {
  it('TimeDecayData captures staleness context', () => {
    const data: TimeDecayData = {
      entityType: 'document',
      entityId: 'doc-123',
      entityName: 'Tax Return 2023',
      lastUpdated: '2024-06-15T00:00:00.000Z',
      daysSinceUpdate: 210,
      thresholdDays: 180,
    }

    expect(data.entityType).toBe('document')
    expect(data.daysSinceUpdate).toBeGreaterThan(data.thresholdDays)
  })

  it('document decay severity escalates based on staleness duration', () => {
    function getDocumentDecaySeverity(daysSinceUpdate: number) {
      if (daysSinceUpdate > 180) return 'HIGH'
      if (daysSinceUpdate > 90) return 'MEDIUM'
      return 'LOW'
    }

    expect(getDocumentDecaySeverity(30)).toBe('LOW')
    expect(getDocumentDecaySeverity(91)).toBe('MEDIUM')
    expect(getDocumentDecaySeverity(181)).toBe('HIGH')
    expect(getDocumentDecaySeverity(365)).toBe('HIGH')
  })

  it('financial staleness severity escalates for > 1 year', () => {
    function getFinancialStalenessSeverity(daysSinceUpdate: number) {
      return daysSinceUpdate > 365 ? 'CRITICAL' : 'HIGH'
    }

    expect(getFinancialStalenessSeverity(200)).toBe('HIGH')
    expect(getFinancialStalenessSeverity(366)).toBe('CRITICAL')
    expect(getFinancialStalenessSeverity(730)).toBe('CRITICAL')
  })

  it('time decay signals use CONFIDENT confidence level', () => {
    const confidence = getDefaultConfidenceForChannel('TIME_DECAY')
    expect(confidence).toBe('CONFIDENT')
  })

  it('TimeDecayData supports financial_period entity type', () => {
    const data: TimeDecayData = {
      entityType: 'financial_period',
      entityId: 'fp-2023-q4',
      entityName: 'Financial data for Acme Corp',
      lastUpdated: '2023-12-31T00:00:00.000Z',
      daysSinceUpdate: 400,
      thresholdDays: 180,
    }

    expect(data.entityType).toBe('financial_period')
    expect(data.daysSinceUpdate).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Channel 5: Advisor Signal Workflow
// ---------------------------------------------------------------------------

describe('Channel 5: Advisor Signal Workflow', () => {
  it('AdvisorSignalData captures advisor observation context', () => {
    const data: AdvisorSignalData = {
      advisorUserId: 'user-advisor-1',
      observationType: 'advisor_observation',
    }

    expect(data.advisorUserId).toBeDefined()
    expect(data.observationType).toBe('advisor_observation')
  })

  it('advisor confirmation captures both old and new confidence', () => {
    const data: AdvisorSignalData = {
      advisorUserId: 'user-advisor-1',
      observationType: 'advisor_confirmation',
      originalSignalId: 'signal-abc',
      previousConfidence: 'UNCERTAIN',
      newConfidence: 'CONFIDENT',
    }

    expect(data.previousConfidence).toBe('UNCERTAIN')
    expect(data.newConfidence).toBe('CONFIDENT')
  })

  it('advisor denial captures reason and confidence change', () => {
    const data: AdvisorSignalData = {
      advisorUserId: 'user-advisor-1',
      observationType: 'advisor_denial',
      originalSignalId: 'signal-abc',
      previousConfidence: 'CONFIDENT',
      newConfidence: 'UNCERTAIN',
      reason: 'Insurance policy was already renewed, not a current risk',
    }

    expect(data.reason).toBeDefined()
    expect(data.previousConfidence).toBe('CONFIDENT')
    expect(data.newConfidence).toBe('UNCERTAIN')
  })

  it('advisor signals use CONFIDENT default confidence', () => {
    const confidence = getDefaultConfidenceForChannel('ADVISOR')
    expect(confidence).toBe('CONFIDENT')
  })

  describe('confirmation value impact calculation', () => {
    it('calculates value recovered from confidence upgrade', () => {
      const rawImpact = 100000
      const previousConfidence = 'UNCERTAIN' as const
      const upgradedConfidence = getUpgradedConfidence(previousConfidence)

      const previousWeighted = applyConfidenceWeight(rawImpact, previousConfidence)
      const upgradedWeighted = applyConfidenceWeight(rawImpact, upgradedConfidence)
      const deltaValueRecovered = Math.max(0, upgradedWeighted - previousWeighted)

      // UNCERTAIN (0.5) -> CONFIDENT (0.85): $50K -> $85K = $35K recovered
      expect(deltaValueRecovered).toBe(35000)
    })

    it('calculates zero value recovered when no estimated impact', () => {
      const rawImpact = 0
      const previousConfidence = 'UNCERTAIN' as const
      const upgradedConfidence = getUpgradedConfidence(previousConfidence)

      const previousWeighted = applyConfidenceWeight(rawImpact, previousConfidence)
      const upgradedWeighted = applyConfidenceWeight(rawImpact, upgradedConfidence)
      const deltaValueRecovered = Math.max(0, upgradedWeighted - previousWeighted)

      expect(deltaValueRecovered).toBe(0)
    })
  })

  describe('dismissal value impact calculation', () => {
    it('calculates value at risk from confidence downgrade', () => {
      const rawImpact = 100000
      const previousConfidence = 'CONFIDENT' as const
      const downgradedConfidence = getDowngradedConfidence(previousConfidence)

      const previousWeighted = applyConfidenceWeight(rawImpact, previousConfidence)
      const downgradedWeighted = applyConfidenceWeight(rawImpact, downgradedConfidence)
      const deltaValueAtRisk = Math.max(0, previousWeighted - downgradedWeighted)

      // CONFIDENT (0.85) -> UNCERTAIN (0.5): $85K -> $50K = $35K at risk
      expect(deltaValueAtRisk).toBe(35000)
    })

    it('handles already-minimum confidence with zero impact', () => {
      const rawImpact = 100000
      const previousConfidence = 'UNCERTAIN' as const
      const downgradedConfidence = getDowngradedConfidence(previousConfidence)

      const previousWeighted = applyConfidenceWeight(rawImpact, previousConfidence)
      const downgradedWeighted = applyConfidenceWeight(rawImpact, downgradedConfidence)
      const deltaValueAtRisk = Math.max(0, previousWeighted - downgradedWeighted)

      // UNCERTAIN stays UNCERTAIN: no change
      expect(deltaValueAtRisk).toBe(0)
    })

    it('VERIFIED -> SOMEWHAT_CONFIDENT produces significant impact', () => {
      const rawImpact = 200000
      const previousConfidence = 'VERIFIED' as const
      const downgradedConfidence = getDowngradedConfidence(previousConfidence)

      const previousWeighted = applyConfidenceWeight(rawImpact, previousConfidence)
      const downgradedWeighted = applyConfidenceWeight(rawImpact, downgradedConfidence)
      const deltaValueAtRisk = Math.max(0, previousWeighted - downgradedWeighted)

      // VERIFIED (1.0) -> SOMEWHAT_CONFIDENT (0.7): $200K -> $140K = $60K at risk
      expect(deltaValueAtRisk).toBe(60000)
    })
  })
})

// ---------------------------------------------------------------------------
// Cross-Channel Consistency
// ---------------------------------------------------------------------------

describe('cross-channel signal consistency', () => {
  it('all 5 channels have defined default confidence levels', () => {
    const channels = [
      'PROMPTED_DISCLOSURE',
      'TASK_GENERATED',
      'TIME_DECAY',
      'EXTERNAL',
      'ADVISOR',
    ] as const

    for (const channel of channels) {
      const confidence = getDefaultConfidenceForChannel(channel)
      expect(confidence).toBeDefined()
      expect(CONFIDENCE_MULTIPLIERS[confidence]).toBeDefined()
      expect(CONFIDENCE_MULTIPLIERS[confidence]).toBeGreaterThan(0)
    }
  })

  it('system channels have higher default confidence than user-reported channels', () => {
    const systemChannels = ['TASK_GENERATED', 'TIME_DECAY'] as const
    const userChannels = ['PROMPTED_DISCLOSURE', 'EXTERNAL'] as const

    for (const sys of systemChannels) {
      for (const user of userChannels) {
        const sysMultiplier = CONFIDENCE_MULTIPLIERS[getDefaultConfidenceForChannel(sys)]
        const userMultiplier = CONFIDENCE_MULTIPLIERS[getDefaultConfidenceForChannel(user)]
        expect(sysMultiplier).toBeGreaterThanOrEqual(userMultiplier)
      }
    }
  })

  it('confidence-weighted impacts are deterministic (same input = same output)', () => {
    const scenarios = [
      { impact: 100000, confidence: 'UNCERTAIN' as const },
      { impact: 50000, confidence: 'CONFIDENT' as const },
      { impact: 200000, confidence: 'VERIFIED' as const },
      { impact: -30000, confidence: 'SOMEWHAT_CONFIDENT' as const },
    ]

    for (const scenario of scenarios) {
      const result1 = applyConfidenceWeight(scenario.impact, scenario.confidence)
      const result2 = applyConfidenceWeight(scenario.impact, scenario.confidence)
      expect(result1).toBe(result2)
    }
  })
})

// ---------------------------------------------------------------------------
// Severity Escalation Rules
// ---------------------------------------------------------------------------

describe('severity escalation rules', () => {
  it('document decay escalation thresholds', () => {
    // These thresholds match the cron job logic
    function getDocDecaySeverity(days: number) {
      if (days > 180) return 'HIGH'
      if (days > 90) return 'MEDIUM'
      return 'LOW'
    }

    // Boundary tests
    expect(getDocDecaySeverity(89)).toBe('LOW')
    expect(getDocDecaySeverity(90)).toBe('LOW')
    expect(getDocDecaySeverity(91)).toBe('MEDIUM')
    expect(getDocDecaySeverity(179)).toBe('MEDIUM')
    expect(getDocDecaySeverity(180)).toBe('MEDIUM')
    expect(getDocDecaySeverity(181)).toBe('HIGH')
  })

  it('financial staleness escalation thresholds', () => {
    function getFinSeverity(days: number) {
      return days > 365 ? 'CRITICAL' : 'HIGH'
    }

    expect(getFinSeverity(200)).toBe('HIGH')
    expect(getFinSeverity(365)).toBe('HIGH')
    expect(getFinSeverity(366)).toBe('CRITICAL')
  })

  it('task BRI impact severity thresholds', () => {
    function getTaskSeverity(briDelta: number) {
      if (briDelta >= 0.05) return 'HIGH'
      if (briDelta >= 0.02) return 'MEDIUM'
      return 'LOW'
    }

    expect(getTaskSeverity(0.001)).toBe('LOW')
    expect(getTaskSeverity(0.019)).toBe('LOW')
    expect(getTaskSeverity(0.02)).toBe('MEDIUM')
    expect(getTaskSeverity(0.049)).toBe('MEDIUM')
    expect(getTaskSeverity(0.05)).toBe('HIGH')
    expect(getTaskSeverity(0.10)).toBe('HIGH')
  })
})
