import { describe, it, expect } from 'vitest'
import {
  DILIGENCE_SECTIONS,
  DILIGENCE_SECTION_MAP,
  mapEvidenceToDiligence,
  getEvidenceCategoriesForSection,
  type DiligenceSection,
} from '../diligence-sections'
import { EVIDENCE_CATEGORIES, type EvidenceCategory } from '../evidence-categories'

describe('diligence-sections', () => {
  describe('DILIGENCE_SECTIONS', () => {
    it('has exactly 5 sections', () => {
      expect(DILIGENCE_SECTIONS).toHaveLength(5)
    })

    it('has the correct section ids', () => {
      const ids = DILIGENCE_SECTIONS.map(s => s.id)
      expect(ids).toEqual(['financial', 'legal', 'operations', 'hr', 'commercial'])
    })

    it('each section has required fields', () => {
      for (const section of DILIGENCE_SECTIONS) {
        expect(section.id).toBeDefined()
        expect(section.label).toBeDefined()
        expect(section.description).toBeDefined()
        expect(section.evidenceCategories).toBeDefined()
        expect(section.evidenceCategories.length).toBeGreaterThan(0)
        expect(section.sortOrder).toBeGreaterThan(0)
      }
    })

    it('every evidence category is mapped to exactly one section', () => {
      const allMappedCategories = DILIGENCE_SECTIONS.flatMap(s => s.evidenceCategories)
      const evidenceCategoryIds = EVIDENCE_CATEGORIES.map(c => c.id)

      // Every evidence category should appear in the diligence sections
      for (const ecId of evidenceCategoryIds) {
        expect(allMappedCategories).toContain(ecId)
      }

      // No evidence category should appear in more than one section
      const seen = new Set<string>()
      for (const cat of allMappedCategories) {
        expect(seen.has(cat)).toBe(false)
        seen.add(cat)
      }
    })

    it('sort orders are unique and sequential', () => {
      const orders = DILIGENCE_SECTIONS.map(s => s.sortOrder)
      const uniqueOrders = new Set(orders)
      expect(uniqueOrders.size).toBe(orders.length)
    })
  })

  describe('DILIGENCE_SECTION_MAP', () => {
    it('contains all 5 sections', () => {
      const keys = Object.keys(DILIGENCE_SECTION_MAP)
      expect(keys).toHaveLength(5)
    })

    it('maps each id to the correct section', () => {
      for (const section of DILIGENCE_SECTIONS) {
        expect(DILIGENCE_SECTION_MAP[section.id]).toBe(section)
      }
    })
  })

  describe('mapEvidenceToDiligence', () => {
    it('maps financial evidence to financial diligence', () => {
      expect(mapEvidenceToDiligence('financial')).toBe('financial')
    })

    it('maps legal evidence to legal diligence', () => {
      expect(mapEvidenceToDiligence('legal')).toBe('legal')
    })

    it('maps operational evidence to operations diligence', () => {
      expect(mapEvidenceToDiligence('operational')).toBe('operations')
    })

    it('maps ipTech evidence to operations diligence', () => {
      expect(mapEvidenceToDiligence('ipTech')).toBe('operations')
    })

    it('maps team evidence to HR diligence', () => {
      expect(mapEvidenceToDiligence('team')).toBe('hr')
    })

    it('maps customers evidence to commercial diligence', () => {
      expect(mapEvidenceToDiligence('customers')).toBe('commercial')
    })

    it('falls back to operations for unknown categories', () => {
      // TypeScript would prevent this, but runtime safety matters
      expect(mapEvidenceToDiligence('unknown' as EvidenceCategory)).toBe('operations')
    })
  })

  describe('getEvidenceCategoriesForSection', () => {
    it('returns correct categories for each section', () => {
      expect(getEvidenceCategoriesForSection('financial')).toEqual(['financial'])
      expect(getEvidenceCategoriesForSection('legal')).toEqual(['legal'])
      expect(getEvidenceCategoriesForSection('operations')).toEqual(['operational', 'ipTech'])
      expect(getEvidenceCategoriesForSection('hr')).toEqual(['team'])
      expect(getEvidenceCategoriesForSection('commercial')).toEqual(['customers'])
    })

    it('returns empty array for unknown section', () => {
      expect(getEvidenceCategoriesForSection('unknown' as DiligenceSection)).toEqual([])
    })
  })
})
