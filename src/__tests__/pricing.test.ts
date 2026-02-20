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

    it('should have foundation, growth, and deal-room tiers', () => {
      const tierIds = PRICING_PLANS.map(p => p.id)
      expect(tierIds).toContain('foundation')
      expect(tierIds).toContain('growth')
      expect(tierIds).toContain('deal-room')
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

    it('deal-room plan should have correct pricing', () => {
      const dealRoom = PRICING_PLANS.find(p => p.id === 'deal-room')
      expect(dealRoom?.monthlyPrice).toBe(449)
      expect(dealRoom?.annualPrice).toBe(379)
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
      // All plans include Exit Readiness Assessment
      expect(hasFeatureAccess('foundation', 'Exit Readiness Assessment')).toBe(true)
      expect(hasFeatureAccess('growth', 'Exit Readiness Assessment')).toBe(true)
      expect(hasFeatureAccess('deal-room', 'Exit Readiness Assessment')).toBe(true)
    })

    it('should return false for excluded features', () => {
      // Foundation does not include Full Risk Diagnostic
      expect(hasFeatureAccess('foundation', 'Full Risk Diagnostic')).toBe(false)
    })

    it('should return true for growth features', () => {
      expect(hasFeatureAccess('growth', 'Full Risk Diagnostic')).toBe(true)
      expect(hasFeatureAccess('growth', 'Personal Readiness Check')).toBe(true)
      expect(hasFeatureAccess('growth', 'Value Improvement Action Plan')).toBe(true)
      expect(hasFeatureAccess('growth', 'Automated Financial Sync')).toBe(true)
    })

    it('should return true for deal-room-only features', () => {
      expect(hasFeatureAccess('deal-room', 'Buyer-Ready Data Room')).toBe(true)
      expect(hasFeatureAccess('deal-room', 'Discounted Cash Flow Analysis')).toBe(true)
      expect(hasFeatureAccess('deal-room', 'Multi-Company Portfolio')).toBe(true)
    })

    it('should return false for deal-room-only features on lower tiers', () => {
      expect(hasFeatureAccess('foundation', 'Buyer-Ready Data Room')).toBe(false)
      expect(hasFeatureAccess('growth', 'Buyer-Ready Data Room')).toBe(false)
      expect(hasFeatureAccess('foundation', 'Discounted Cash Flow Analysis')).toBe(false)
      // Note: Growth plan includes DCF, so hasFeatureAccess('growth', 'Discounted Cash Flow Analysis') is true
      expect(hasFeatureAccess('foundation', 'Deal Pipeline Manager')).toBe(false)
      expect(hasFeatureAccess('growth', 'Deal Pipeline Manager')).toBe(false)
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

      const dealRoom = getPlan('deal-room')
      expect(dealRoom?.id).toBe('deal-room')
      expect(dealRoom?.name).toBe('Deal Room')
    })

    it('should return undefined for invalid tier', () => {
      expect(getPlan('invalid' as PlanTier)).toBeUndefined()
    })
  })
})
