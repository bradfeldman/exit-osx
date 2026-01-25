import { describe, it, expect } from 'vitest'
import {
  PRICING_PLANS,
  hasFeatureAccess,
  getPlan,
  type PlanTier
} from '@/lib/pricing'

describe('Pricing Plans', () => {
  describe('PRICING_PLANS constant', () => {
    it('should have exactly 3 plans', () => {
      expect(PRICING_PLANS).toHaveLength(3)
    })

    it('should have foundation, growth, and exit-ready tiers', () => {
      const tierIds = PRICING_PLANS.map(p => p.id)
      expect(tierIds).toContain('foundation')
      expect(tierIds).toContain('growth')
      expect(tierIds).toContain('exit-ready')
    })

    it('foundation plan should be free', () => {
      const foundation = PRICING_PLANS.find(p => p.id === 'foundation')
      expect(foundation?.monthlyPrice).toBe(0)
      expect(foundation?.annualPrice).toBe(0)
    })

    it('growth plan should have correct pricing', () => {
      const growth = PRICING_PLANS.find(p => p.id === 'growth')
      expect(growth?.monthlyPrice).toBe(179)
      expect(growth?.annualPrice).toBe(149)
    })

    it('exit-ready plan should have correct pricing', () => {
      const exitReady = PRICING_PLANS.find(p => p.id === 'exit-ready')
      expect(exitReady?.monthlyPrice).toBe(449)
      expect(exitReady?.annualPrice).toBe(379)
    })

    it('annual pricing should be less than monthly for paid plans', () => {
      PRICING_PLANS.forEach(plan => {
        if (plan.monthlyPrice > 0) {
          expect(plan.annualPrice).toBeLessThan(plan.monthlyPrice)
        }
      })
    })

    it('growth plan should be highlighted', () => {
      const growth = PRICING_PLANS.find(p => p.id === 'growth')
      expect(growth?.highlighted).toBe(true)
    })

    it('each plan should have features array', () => {
      PRICING_PLANS.forEach(plan => {
        expect(Array.isArray(plan.features)).toBe(true)
        expect(plan.features.length).toBeGreaterThan(0)
      })
    })
  })

  describe('hasFeatureAccess', () => {
    it('should return true for included features', () => {
      // All plans include Initial Assessment
      expect(hasFeatureAccess('foundation', 'Initial Assessment')).toBe(true)
      expect(hasFeatureAccess('growth', 'Initial Assessment')).toBe(true)
      expect(hasFeatureAccess('exit-ready', 'Initial Assessment')).toBe(true)
    })

    it('should return false for excluded features', () => {
      // Foundation does not include Company Assessment
      expect(hasFeatureAccess('foundation', 'Company Assessment')).toBe(false)
    })

    it('should return true for growth features', () => {
      expect(hasFeatureAccess('growth', 'Company Assessment')).toBe(true)
      expect(hasFeatureAccess('growth', 'Risk Assessment')).toBe(true)
      expect(hasFeatureAccess('growth', 'Value Improvement Playbook')).toBe(true)
      expect(hasFeatureAccess('growth', 'QuickBooks Integration')).toBe(true)
    })

    it('should return true for exit-ready-only features', () => {
      expect(hasFeatureAccess('exit-ready', 'Data Room')).toBe(true)
      expect(hasFeatureAccess('exit-ready', 'DCF Analysis')).toBe(true)
      expect(hasFeatureAccess('exit-ready', 'Multiple Companies')).toBe(true)
    })

    it('should return false for exit-ready-only features on lower tiers', () => {
      expect(hasFeatureAccess('foundation', 'Data Room')).toBe(false)
      expect(hasFeatureAccess('growth', 'Data Room')).toBe(false)
      expect(hasFeatureAccess('foundation', 'DCF Analysis')).toBe(false)
      expect(hasFeatureAccess('growth', 'DCF Analysis')).toBe(false)
    })

    it('should return false for non-existent features', () => {
      expect(hasFeatureAccess('foundation', 'Non Existent Feature')).toBe(false)
      expect(hasFeatureAccess('growth', 'Non Existent Feature')).toBe(false)
    })

    it('should return false for invalid tier', () => {
      expect(hasFeatureAccess('invalid' as PlanTier, 'Initial Assessment')).toBe(false)
    })
  })

  describe('getPlan', () => {
    it('should return correct plan for valid tier', () => {
      const foundation = getPlan('foundation')
      expect(foundation?.id).toBe('foundation')
      expect(foundation?.name).toBe('Foundation')

      const growth = getPlan('growth')
      expect(growth?.id).toBe('growth')
      expect(growth?.name).toBe('Growth')

      const exitReady = getPlan('exit-ready')
      expect(exitReady?.id).toBe('exit-ready')
      expect(exitReady?.name).toBe('Exit-Ready')
    })

    it('should return undefined for invalid tier', () => {
      expect(getPlan('invalid' as PlanTier)).toBeUndefined()
    })
  })
})
