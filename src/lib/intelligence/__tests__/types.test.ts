import { describe, it, expect } from 'vitest'
import {
  ALL_INTELLIGENCE_SECTIONS,
  DOSSIER_SECTIONS,
  SUPPLEMENTAL_SECTIONS,
  isValidSectionName,
} from '../types'

describe('Intelligence Section Constants', () => {
  it('ALL_INTELLIGENCE_SECTIONS contains exactly 12 sections', () => {
    expect(ALL_INTELLIGENCE_SECTIONS).toHaveLength(12)
  })

  it('DOSSIER_SECTIONS contains exactly 9 sections', () => {
    expect(DOSSIER_SECTIONS).toHaveLength(9)
  })

  it('SUPPLEMENTAL_SECTIONS contains exactly 3 sections', () => {
    expect(SUPPLEMENTAL_SECTIONS).toHaveLength(3)
  })

  it('DOSSIER + SUPPLEMENTAL = ALL', () => {
    const combined = [...DOSSIER_SECTIONS, ...SUPPLEMENTAL_SECTIONS]
    expect(combined).toHaveLength(ALL_INTELLIGENCE_SECTIONS.length)
    for (const section of ALL_INTELLIGENCE_SECTIONS) {
      expect(combined).toContain(section)
    }
  })

  it('SUPPLEMENTAL_SECTIONS are naFlags, disclosures, notes', () => {
    expect(SUPPLEMENTAL_SECTIONS).toContain('naFlags')
    expect(SUPPLEMENTAL_SECTIONS).toContain('disclosures')
    expect(SUPPLEMENTAL_SECTIONS).toContain('notes')
  })

  it('DOSSIER_SECTIONS matches the 9 dossier types', () => {
    const expected = ['identity', 'financials', 'assessment', 'valuation', 'tasks', 'evidence', 'signals', 'engagement', 'aiContext']
    for (const section of expected) {
      expect(DOSSIER_SECTIONS).toContain(section)
    }
  })
})

describe('isValidSectionName', () => {
  it('returns true for all valid section names', () => {
    for (const section of ALL_INTELLIGENCE_SECTIONS) {
      expect(isValidSectionName(section)).toBe(true)
    }
  })

  it('returns false for invalid section names', () => {
    expect(isValidSectionName('invalid')).toBe(false)
    expect(isValidSectionName('')).toBe(false)
    expect(isValidSectionName('FINANCIAL')).toBe(false)  // BRI category, not section name
    expect(isValidSectionName('Identity')).toBe(false)   // case-sensitive
  })

  it('returns true for supplemental sections', () => {
    expect(isValidSectionName('naFlags')).toBe(true)
    expect(isValidSectionName('disclosures')).toBe(true)
    expect(isValidSectionName('notes')).toBe(true)
  })
})
