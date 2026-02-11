import { describe, it, expect } from 'vitest'
import { mapBriCategoryToEvidence, mapDataRoomCategoryToEvidence } from '../category-mapper'

describe('category-mapper', () => {
  describe('mapBriCategoryToEvidence', () => {
    it('maps all 6 BRI categories to evidence categories', () => {
      expect(mapBriCategoryToEvidence('FINANCIAL')).toBe('financial')
      expect(mapBriCategoryToEvidence('TRANSFERABILITY')).toBe('team')
      expect(mapBriCategoryToEvidence('OPERATIONAL')).toBe('operational')
      expect(mapBriCategoryToEvidence('MARKET')).toBe('customers')
      expect(mapBriCategoryToEvidence('LEGAL_TAX')).toBe('legal')
      expect(mapBriCategoryToEvidence('PERSONAL')).toBe('team')
    })

    it('returns operational as fallback for unknown BRI categories', () => {
      expect(mapBriCategoryToEvidence('UNKNOWN')).toBe('operational')
      expect(mapBriCategoryToEvidence('')).toBe('operational')
    })

    it('covers every evidence category', () => {
      const evidenceCategories = new Set([
        mapBriCategoryToEvidence('FINANCIAL'),
        mapBriCategoryToEvidence('TRANSFERABILITY'),
        mapBriCategoryToEvidence('OPERATIONAL'),
        mapBriCategoryToEvidence('MARKET'),
        mapBriCategoryToEvidence('LEGAL_TAX'),
        mapBriCategoryToEvidence('PERSONAL'),
      ])
      // Should cover at least 5 of 6 evidence categories
      // (ipTech is not a BRI category, so it won't be covered)
      expect(evidenceCategories.size).toBeGreaterThanOrEqual(4)
      expect(evidenceCategories.has('financial')).toBe(true)
      expect(evidenceCategories.has('legal')).toBe(true)
      expect(evidenceCategories.has('operational')).toBe(true)
      expect(evidenceCategories.has('customers')).toBe(true)
      expect(evidenceCategories.has('team')).toBe(true)
    })

    it('TRANSFERABILITY maps to team (not operational)', () => {
      // PROD-040: Transfer risk is about people dependencies
      expect(mapBriCategoryToEvidence('TRANSFERABILITY')).toBe('team')
    })

    it('PERSONAL maps to team (not operational)', () => {
      // PROD-040: Personal readiness overlaps with team/succession
      expect(mapBriCategoryToEvidence('PERSONAL')).toBe('team')
    })
  })

  describe('mapDataRoomCategoryToEvidence', () => {
    it('maps financial categories', () => {
      expect(mapDataRoomCategoryToEvidence('FINANCIAL')).toBe('financial')
      expect(mapDataRoomCategoryToEvidence('TAX')).toBe('financial')
    })

    it('maps legal categories', () => {
      expect(mapDataRoomCategoryToEvidence('LEGAL')).toBe('legal')
      expect(mapDataRoomCategoryToEvidence('CORPORATE')).toBe('legal')
      expect(mapDataRoomCategoryToEvidence('INSURANCE')).toBe('legal')
    })

    it('maps operational categories', () => {
      expect(mapDataRoomCategoryToEvidence('OPERATIONS')).toBe('operational')
      expect(mapDataRoomCategoryToEvidence('REAL_ESTATE')).toBe('operational')
      expect(mapDataRoomCategoryToEvidence('ENVIRONMENTAL')).toBe('operational')
    })

    it('maps customer categories', () => {
      expect(mapDataRoomCategoryToEvidence('CUSTOMERS')).toBe('customers')
      expect(mapDataRoomCategoryToEvidence('SALES_MARKETING')).toBe('customers')
    })

    it('maps team categories', () => {
      expect(mapDataRoomCategoryToEvidence('EMPLOYEES')).toBe('team')
    })

    it('maps IP/tech categories', () => {
      expect(mapDataRoomCategoryToEvidence('IP')).toBe('ipTech')
      expect(mapDataRoomCategoryToEvidence('TECHNOLOGY')).toBe('ipTech')
    })

    it('maps special categories', () => {
      expect(mapDataRoomCategoryToEvidence('TASK_PROOF')).toBe('operational')
      expect(mapDataRoomCategoryToEvidence('CUSTOM')).toBe('operational')
    })

    it('returns operational as fallback for unknown data room categories', () => {
      expect(mapDataRoomCategoryToEvidence('UNKNOWN')).toBe('operational')
    })
  })
})
