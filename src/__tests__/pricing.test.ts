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

    it('should have starter, professional, and enterprise tiers', () => {
      const tierIds = PRICING_PLANS.map(p => p.id)
      expect(tierIds).toContain('starter')
      expect(tierIds).toContain('professional')
      expect(tierIds).toContain('enterprise')
    })

    it('starter plan should be free', () => {
      const starter = PRICING_PLANS.find(p => p.id === 'starter')
      expect(starter?.monthlyPrice).toBe(0)
      expect(starter?.annualPrice).toBe(0)
    })

    it('professional plan should have correct pricing', () => {
      const professional = PRICING_PLANS.find(p => p.id === 'professional')
      expect(professional?.monthlyPrice).toBe(149)
      expect(professional?.annualPrice).toBe(119)
    })

    it('enterprise plan should have correct pricing', () => {
      const enterprise = PRICING_PLANS.find(p => p.id === 'enterprise')
      expect(enterprise?.monthlyPrice).toBe(399)
      expect(enterprise?.annualPrice).toBe(319)
    })

    it('annual pricing should be less than monthly for paid plans', () => {
      PRICING_PLANS.forEach(plan => {
        if (plan.monthlyPrice > 0) {
          expect(plan.annualPrice).toBeLessThan(plan.monthlyPrice)
        }
      })
    })

    it('professional plan should be highlighted', () => {
      const professional = PRICING_PLANS.find(p => p.id === 'professional')
      expect(professional?.highlighted).toBe(true)
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
      expect(hasFeatureAccess('starter', 'Initial Assessment')).toBe(true)
      expect(hasFeatureAccess('professional', 'Initial Assessment')).toBe(true)
      expect(hasFeatureAccess('enterprise', 'Initial Assessment')).toBe(true)
    })

    it('should return false for excluded features', () => {
      // Starter does not include Company Assessment
      expect(hasFeatureAccess('starter', 'Company Assessment')).toBe(false)
    })

    it('should return true for professional features', () => {
      expect(hasFeatureAccess('professional', 'Company Assessment')).toBe(true)
      expect(hasFeatureAccess('professional', 'Risk Assessment')).toBe(true)
      expect(hasFeatureAccess('professional', 'Value Improvement Playbook')).toBe(true)
    })

    it('should return true for enterprise-only features', () => {
      expect(hasFeatureAccess('enterprise', 'Data Room')).toBe(true)
      expect(hasFeatureAccess('enterprise', 'DCF Analysis')).toBe(true)
      expect(hasFeatureAccess('enterprise', 'Multiple Companies')).toBe(true)
    })

    it('should return false for enterprise-only features on lower tiers', () => {
      expect(hasFeatureAccess('starter', 'Data Room')).toBe(false)
      expect(hasFeatureAccess('professional', 'Data Room')).toBe(false)
      expect(hasFeatureAccess('starter', 'DCF Analysis')).toBe(false)
      expect(hasFeatureAccess('professional', 'DCF Analysis')).toBe(false)
    })

    it('should return false for non-existent features', () => {
      expect(hasFeatureAccess('starter', 'Non Existent Feature')).toBe(false)
      expect(hasFeatureAccess('professional', 'Non Existent Feature')).toBe(false)
    })

    it('should return false for invalid tier', () => {
      expect(hasFeatureAccess('invalid' as PlanTier, 'Initial Assessment')).toBe(false)
    })
  })

  describe('getPlan', () => {
    it('should return correct plan for valid tier', () => {
      const starter = getPlan('starter')
      expect(starter?.id).toBe('starter')
      expect(starter?.name).toBe('Starter')

      const professional = getPlan('professional')
      expect(professional?.id).toBe('professional')
      expect(professional?.name).toBe('Professional')

      const enterprise = getPlan('enterprise')
      expect(enterprise?.id).toBe('enterprise')
      expect(enterprise?.name).toBe('Enterprise')
    })

    it('should return undefined for invalid tier', () => {
      expect(getPlan('invalid' as PlanTier)).toBeUndefined()
    })
  })
})
