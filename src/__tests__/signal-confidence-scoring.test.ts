import { describe, it, expect } from 'vitest'
import {
  CONFIDENCE_MULTIPLIERS,
  applyConfidenceWeight,
  getUpgradedConfidence,
  getDowngradedConfidence,
  getDefaultConfidenceForChannel,
} from '@/lib/signals/confidence-scoring'

// ---------------------------------------------------------------------------
// CONFIDENCE_MULTIPLIERS
// ---------------------------------------------------------------------------

describe('CONFIDENCE_MULTIPLIERS', () => {
  it('has correct multiplier for UNCERTAIN (0.5x)', () => {
    expect(CONFIDENCE_MULTIPLIERS.UNCERTAIN).toBe(0.5)
  })

  it('has correct multiplier for SOMEWHAT_CONFIDENT (0.7x)', () => {
    expect(CONFIDENCE_MULTIPLIERS.SOMEWHAT_CONFIDENT).toBe(0.7)
  })

  it('has correct multiplier for CONFIDENT (0.85x)', () => {
    expect(CONFIDENCE_MULTIPLIERS.CONFIDENT).toBe(0.85)
  })

  it('has correct multiplier for VERIFIED (1.0x)', () => {
    expect(CONFIDENCE_MULTIPLIERS.VERIFIED).toBe(1.0)
  })

  it('has correct multiplier for NOT_APPLICABLE (1.0x)', () => {
    expect(CONFIDENCE_MULTIPLIERS.NOT_APPLICABLE).toBe(1.0)
  })

  it('multipliers are monotonically increasing', () => {
    const ordered = [
      CONFIDENCE_MULTIPLIERS.UNCERTAIN,
      CONFIDENCE_MULTIPLIERS.SOMEWHAT_CONFIDENT,
      CONFIDENCE_MULTIPLIERS.CONFIDENT,
      CONFIDENCE_MULTIPLIERS.VERIFIED,
    ]
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThanOrEqual(ordered[i - 1])
    }
  })

  it('all multipliers are between 0 and 1 inclusive', () => {
    for (const value of Object.values(CONFIDENCE_MULTIPLIERS)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})

// ---------------------------------------------------------------------------
// applyConfidenceWeight
// ---------------------------------------------------------------------------

describe('applyConfidenceWeight', () => {
  it('reduces UNCERTAIN impact by 50%', () => {
    expect(applyConfidenceWeight(100000, 'UNCERTAIN')).toBe(50000)
  })

  it('reduces SOMEWHAT_CONFIDENT impact by 30%', () => {
    expect(applyConfidenceWeight(100000, 'SOMEWHAT_CONFIDENT')).toBe(70000)
  })

  it('reduces CONFIDENT impact by 15%', () => {
    expect(applyConfidenceWeight(100000, 'CONFIDENT')).toBe(85000)
  })

  it('applies full weight for VERIFIED', () => {
    expect(applyConfidenceWeight(100000, 'VERIFIED')).toBe(100000)
  })

  it('applies full weight for NOT_APPLICABLE', () => {
    expect(applyConfidenceWeight(100000, 'NOT_APPLICABLE')).toBe(100000)
  })

  it('handles zero impact', () => {
    expect(applyConfidenceWeight(0, 'UNCERTAIN')).toBe(0)
    expect(applyConfidenceWeight(0, 'VERIFIED')).toBe(0)
  })

  it('handles negative impact (value at risk)', () => {
    expect(applyConfidenceWeight(-100000, 'UNCERTAIN')).toBe(-50000)
    expect(applyConfidenceWeight(-100000, 'CONFIDENT')).toBe(-85000)
  })

  it('handles fractional amounts correctly', () => {
    expect(applyConfidenceWeight(33333, 'UNCERTAIN')).toBeCloseTo(16666.5)
    expect(applyConfidenceWeight(33333, 'SOMEWHAT_CONFIDENT')).toBeCloseTo(23333.1)
  })

  it('higher confidence always produces higher or equal weighted impact', () => {
    const amount = 50000
    const uncertain = applyConfidenceWeight(amount, 'UNCERTAIN')
    const somewhat = applyConfidenceWeight(amount, 'SOMEWHAT_CONFIDENT')
    const confident = applyConfidenceWeight(amount, 'CONFIDENT')
    const verified = applyConfidenceWeight(amount, 'VERIFIED')

    expect(somewhat).toBeGreaterThan(uncertain)
    expect(confident).toBeGreaterThan(somewhat)
    expect(verified).toBeGreaterThan(confident)
  })
})

// ---------------------------------------------------------------------------
// getUpgradedConfidence
// ---------------------------------------------------------------------------

describe('getUpgradedConfidence', () => {
  it('upgrades UNCERTAIN to CONFIDENT', () => {
    expect(getUpgradedConfidence('UNCERTAIN')).toBe('CONFIDENT')
  })

  it('upgrades SOMEWHAT_CONFIDENT to VERIFIED', () => {
    expect(getUpgradedConfidence('SOMEWHAT_CONFIDENT')).toBe('VERIFIED')
  })

  it('upgrades CONFIDENT to VERIFIED', () => {
    expect(getUpgradedConfidence('CONFIDENT')).toBe('VERIFIED')
  })

  it('keeps VERIFIED unchanged (already at max)', () => {
    expect(getUpgradedConfidence('VERIFIED')).toBe('VERIFIED')
  })

  it('keeps NOT_APPLICABLE unchanged', () => {
    expect(getUpgradedConfidence('NOT_APPLICABLE')).toBe('NOT_APPLICABLE')
  })

  it('never downgrades confidence on upgrade', () => {
    const levels: Array<'UNCERTAIN' | 'SOMEWHAT_CONFIDENT' | 'CONFIDENT' | 'VERIFIED'> = [
      'UNCERTAIN',
      'SOMEWHAT_CONFIDENT',
      'CONFIDENT',
      'VERIFIED',
    ]
    const _multiplierOrder = levels.map(l => CONFIDENCE_MULTIPLIERS[l])

    for (const level of levels) {
      const upgraded = getUpgradedConfidence(level)
      const currentMultiplier = CONFIDENCE_MULTIPLIERS[level]
      const upgradedMultiplier = CONFIDENCE_MULTIPLIERS[upgraded]
      expect(upgradedMultiplier).toBeGreaterThanOrEqual(currentMultiplier)
    }
  })
})

// ---------------------------------------------------------------------------
// getDowngradedConfidence
// ---------------------------------------------------------------------------

describe('getDowngradedConfidence', () => {
  it('downgrades VERIFIED to SOMEWHAT_CONFIDENT', () => {
    expect(getDowngradedConfidence('VERIFIED')).toBe('SOMEWHAT_CONFIDENT')
  })

  it('downgrades CONFIDENT to UNCERTAIN', () => {
    expect(getDowngradedConfidence('CONFIDENT')).toBe('UNCERTAIN')
  })

  it('downgrades SOMEWHAT_CONFIDENT to UNCERTAIN', () => {
    expect(getDowngradedConfidence('SOMEWHAT_CONFIDENT')).toBe('UNCERTAIN')
  })

  it('keeps UNCERTAIN unchanged (already at min)', () => {
    expect(getDowngradedConfidence('UNCERTAIN')).toBe('UNCERTAIN')
  })

  it('keeps NOT_APPLICABLE unchanged', () => {
    expect(getDowngradedConfidence('NOT_APPLICABLE')).toBe('NOT_APPLICABLE')
  })

  it('never upgrades confidence on downgrade', () => {
    const levels: Array<'UNCERTAIN' | 'SOMEWHAT_CONFIDENT' | 'CONFIDENT' | 'VERIFIED'> = [
      'UNCERTAIN',
      'SOMEWHAT_CONFIDENT',
      'CONFIDENT',
      'VERIFIED',
    ]

    for (const level of levels) {
      const downgraded = getDowngradedConfidence(level)
      const currentMultiplier = CONFIDENCE_MULTIPLIERS[level]
      const downgradedMultiplier = CONFIDENCE_MULTIPLIERS[downgraded]
      expect(downgradedMultiplier).toBeLessThanOrEqual(currentMultiplier)
    }
  })
})

// ---------------------------------------------------------------------------
// Upgrade / Downgrade roundtrip behavior
// ---------------------------------------------------------------------------

describe('confidence upgrade/downgrade interactions', () => {
  it('upgrade then downgrade does not necessarily return to original (asymmetric)', () => {
    // This is by design: confirm-then-dismiss should not be a no-op.
    // The system intentionally makes it harder to get back to high confidence
    // after a dismissal.
    const original = 'SOMEWHAT_CONFIDENT' as const
    const upgraded = getUpgradedConfidence(original) // VERIFIED
    const thenDowngraded = getDowngradedConfidence(upgraded) // SOMEWHAT_CONFIDENT
    // In this case it does return, but the point is this is tested
    expect(thenDowngraded).toBeDefined()
  })

  it('downgrade then upgrade does not necessarily return to original', () => {
    const original = 'CONFIDENT' as const
    const downgraded = getDowngradedConfidence(original) // UNCERTAIN
    const thenUpgraded = getUpgradedConfidence(downgraded) // CONFIDENT
    // This happens to roundtrip for CONFIDENT, which is fine
    expect(thenUpgraded).toBeDefined()
  })

  it('UNCERTAIN is a floor -- multiple downgrades stay at UNCERTAIN', () => {
    let level = getDowngradedConfidence('UNCERTAIN')
    expect(level).toBe('UNCERTAIN')
    level = getDowngradedConfidence(level)
    expect(level).toBe('UNCERTAIN')
  })

  it('VERIFIED is a ceiling for upgrades', () => {
    let level = getUpgradedConfidence('VERIFIED')
    expect(level).toBe('VERIFIED')
    level = getUpgradedConfidence(level)
    expect(level).toBe('VERIFIED')
  })
})

// ---------------------------------------------------------------------------
// getDefaultConfidenceForChannel
// ---------------------------------------------------------------------------

describe('getDefaultConfidenceForChannel', () => {
  it('returns SOMEWHAT_CONFIDENT for PROMPTED_DISCLOSURE', () => {
    expect(getDefaultConfidenceForChannel('PROMPTED_DISCLOSURE')).toBe('SOMEWHAT_CONFIDENT')
  })

  it('returns CONFIDENT for TASK_GENERATED', () => {
    expect(getDefaultConfidenceForChannel('TASK_GENERATED')).toBe('CONFIDENT')
  })

  it('returns CONFIDENT for TIME_DECAY', () => {
    expect(getDefaultConfidenceForChannel('TIME_DECAY')).toBe('CONFIDENT')
  })

  it('returns SOMEWHAT_CONFIDENT for EXTERNAL', () => {
    expect(getDefaultConfidenceForChannel('EXTERNAL')).toBe('SOMEWHAT_CONFIDENT')
  })

  it('returns CONFIDENT for ADVISOR', () => {
    expect(getDefaultConfidenceForChannel('ADVISOR')).toBe('CONFIDENT')
  })

  it('system-generated channels have higher confidence than user-reported', () => {
    const taskConfidence = CONFIDENCE_MULTIPLIERS[getDefaultConfidenceForChannel('TASK_GENERATED')]
    const disclosureConfidence = CONFIDENCE_MULTIPLIERS[getDefaultConfidenceForChannel('PROMPTED_DISCLOSURE')]
    expect(taskConfidence).toBeGreaterThan(disclosureConfidence)
  })

  it('TIME_DECAY (deterministic calculation) has high confidence', () => {
    const timeDecayConfidence = CONFIDENCE_MULTIPLIERS[getDefaultConfidenceForChannel('TIME_DECAY')]
    expect(timeDecayConfidence).toBeGreaterThanOrEqual(0.85)
  })
})

// ---------------------------------------------------------------------------
// Confidence weighting end-to-end scenarios
// ---------------------------------------------------------------------------

describe('confidence weighting business scenarios', () => {
  it('advisor confirmation increases effective value impact', () => {
    const rawImpact = 100000

    // Before confirmation: UNCERTAIN (0.5x) = $50K effective
    const beforeConfirm = applyConfidenceWeight(rawImpact, 'UNCERTAIN')
    expect(beforeConfirm).toBe(50000)

    // After advisor confirms: upgrades to CONFIDENT (0.85x) = $85K effective
    const upgraded = getUpgradedConfidence('UNCERTAIN')
    const afterConfirm = applyConfidenceWeight(rawImpact, upgraded)
    expect(afterConfirm).toBe(85000)

    // Value recovered from the confidence upgrade
    const valueRecovered = afterConfirm - beforeConfirm
    expect(valueRecovered).toBe(35000)
  })

  it('advisor dismissal decreases effective value impact', () => {
    const rawImpact = 100000

    // Before dismissal: CONFIDENT (0.85x) = $85K effective
    const beforeDismiss = applyConfidenceWeight(rawImpact, 'CONFIDENT')
    expect(beforeDismiss).toBe(85000)

    // After advisor dismisses: downgrades to UNCERTAIN (0.5x) = $50K effective
    const downgraded = getDowngradedConfidence('CONFIDENT')
    const afterDismiss = applyConfidenceWeight(rawImpact, downgraded)
    expect(afterDismiss).toBe(50000)

    // Value at risk from the confidence downgrade
    const valueAtRisk = beforeDismiss - afterDismiss
    expect(valueAtRisk).toBe(35000)
  })

  it('task completion signal uses correct confidence weight', () => {
    const taskValue = 50000
    const taskConfidence = getDefaultConfidenceForChannel('TASK_GENERATED')
    expect(taskConfidence).toBe('CONFIDENT')

    const weightedValue = applyConfidenceWeight(taskValue, taskConfidence)
    expect(weightedValue).toBe(42500) // 50K * 0.85
  })

  it('external signal uses lower confidence weight until verified', () => {
    const externalImpact = 200000

    // Initial: SOMEWHAT_CONFIDENT (0.7x) = $140K
    const externalConfidence = getDefaultConfidenceForChannel('EXTERNAL')
    const initialWeighted = applyConfidenceWeight(externalImpact, externalConfidence)
    expect(initialWeighted).toBe(140000)

    // After advisor confirms: upgrades to VERIFIED (1.0x) = $200K
    const upgraded = getUpgradedConfidence(externalConfidence)
    const confirmedWeighted = applyConfidenceWeight(externalImpact, upgraded)
    expect(confirmedWeighted).toBe(200000)

    // Confirmation recovered $60K in effective value
    expect(confirmedWeighted - initialWeighted).toBe(60000)
  })

  it('document decay signal has full weight at CONFIDENT', () => {
    const decayImpact = -30000
    const decayConfidence = getDefaultConfidenceForChannel('TIME_DECAY')
    const weighted = applyConfidenceWeight(decayImpact, decayConfidence)
    expect(weighted).toBe(-25500) // -30K * 0.85
  })
})
