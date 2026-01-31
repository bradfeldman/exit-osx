import { describe, it, expect } from 'vitest'
import {
  normalizeCompanyName,
  normalizePersonName,
  extractDomain,
  extractDomainFromUrl,
  stringSimilarity,
} from '@/lib/contact-system/identity-resolution'

describe('Identity Resolution', () => {
  describe('normalizeCompanyName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeCompanyName('ACME')).toBe('acme')
    })

    it('should remove common suffixes', () => {
      expect(normalizeCompanyName('Acme Inc.')).toBe('acme')
      expect(normalizeCompanyName('Acme Corporation')).toBe('acme')
      expect(normalizeCompanyName('Acme LLC')).toBe('acme')
      expect(normalizeCompanyName('Acme Ltd.')).toBe('acme')
      expect(normalizeCompanyName('Acme Co.')).toBe('acme')
    })

    it('should remove "The" prefix', () => {
      expect(normalizeCompanyName('The Acme Company')).toBe('acme')
    })

    it('should remove punctuation', () => {
      expect(normalizeCompanyName('O\'Reilly & Associates')).toBe('oreilly associates')
    })

    it('should collapse whitespace', () => {
      expect(normalizeCompanyName('  Acme   Corp  ')).toBe('acme')
    })

    it('should handle complex names', () => {
      expect(normalizeCompanyName('The McKinsey & Company, Inc.')).toBe('mckinsey')
    })
  })

  describe('normalizePersonName', () => {
    it('should convert to lowercase', () => {
      expect(normalizePersonName('John', 'SMITH')).toBe('john smith')
    })

    it('should remove suffixes', () => {
      expect(normalizePersonName('John', 'Smith Jr.')).toBe('john smith')
      expect(normalizePersonName('Robert', 'Jones III')).toBe('robert jones')
      expect(normalizePersonName('William', 'Brown PhD')).toBe('william brown')
    })

    it('should remove punctuation', () => {
      expect(normalizePersonName("Mary-Jane", "O'Connor")).toBe('maryjane oconnor')
    })

    it('should collapse whitespace', () => {
      expect(normalizePersonName('  John  ', '  Smith  ')).toBe('john smith')
    })
  })

  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      expect(extractDomain('john@acme.com')).toBe('acme.com')
    })

    it('should handle subdomains', () => {
      expect(extractDomain('john@mail.acme.com')).toBe('mail.acme.com')
    })

    it('should convert to lowercase', () => {
      expect(extractDomain('john@ACME.COM')).toBe('acme.com')
    })

    it('should return null for invalid email', () => {
      expect(extractDomain('not-an-email')).toBeNull()
    })

    it('should handle various TLDs', () => {
      expect(extractDomain('john@acme.co.uk')).toBe('acme.co.uk')
      expect(extractDomain('john@acme.io')).toBe('acme.io')
    })
  })

  describe('extractDomainFromUrl', () => {
    it('should extract domain from full URL', () => {
      expect(extractDomainFromUrl('https://www.acme.com/about')).toBe('acme.com')
    })

    it('should remove www prefix', () => {
      expect(extractDomainFromUrl('https://www.acme.com')).toBe('acme.com')
    })

    it('should handle URLs without protocol', () => {
      expect(extractDomainFromUrl('acme.com/products')).toBe('acme.com')
    })

    it('should handle http URLs', () => {
      expect(extractDomainFromUrl('http://acme.com')).toBe('acme.com')
    })

    it('should convert to lowercase', () => {
      expect(extractDomainFromUrl('https://ACME.COM')).toBe('acme.com')
    })

    it('should return null for invalid URL', () => {
      expect(extractDomainFromUrl('not a url')).toBeNull()
    })

    it('should handle subdomains', () => {
      expect(extractDomainFromUrl('https://shop.acme.com')).toBe('shop.acme.com')
    })
  })

  describe('stringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(stringSimilarity('acme', 'acme')).toBe(1)
    })

    it('should return 0 for completely different strings', () => {
      expect(stringSimilarity('abc', 'xyz')).toBe(0)
    })

    it('should handle empty strings', () => {
      expect(stringSimilarity('', '')).toBe(1)
    })

    it('should calculate similarity for similar strings', () => {
      const similarity = stringSimilarity('acme', 'acne')
      expect(similarity).toBeGreaterThan(0.5)
      expect(similarity).toBeLessThan(1)
    })

    it('should handle case-sensitive comparison', () => {
      // These are normalized first in practice, but raw comparison is case-sensitive
      expect(stringSimilarity('Acme', 'acme')).toBeLessThan(1)
    })

    it('should give high similarity for minor typos', () => {
      expect(stringSimilarity('blackstone', 'blackstoone')).toBeGreaterThan(0.85)
    })

    it('should give lower similarity for different names', () => {
      expect(stringSimilarity('kkr', 'blackstone')).toBeLessThan(0.3)
    })
  })

  describe('Match Confidence Thresholds', () => {
    // These tests document the expected behavior of the matching system

    it('should have correct threshold values', async () => {
      const { DEFAULT_MATCH_CONFIG } = await import('@/lib/contact-system/identity-resolution')

      expect(DEFAULT_MATCH_CONFIG.autoLinkThreshold).toBe(0.95)
      expect(DEFAULT_MATCH_CONFIG.suggestThreshold).toBe(0.70)
      expect(DEFAULT_MATCH_CONFIG.provisionalThreshold).toBe(0.50)
    })
  })

  describe('Company Matching Scenarios', () => {
    // These are integration test scenarios that would require database mocking
    // Documenting the expected behavior for reference

    it.skip('should auto-link on exact domain match', async () => {
      // When: Input has domain "kkr.com"
      // And: Canonical company exists with domain "kkr.com"
      // Then: Suggested action should be AUTO_LINK
      // And: Confidence should be >= 0.95
    })

    it.skip('should suggest merge on high name similarity', async () => {
      // When: Input name is "Blackstone Inc"
      // And: Canonical company exists as "Blackstone Group"
      // Then: Suggested action should be SUGGEST_MERGE
      // And: Confidence should be between 0.70 and 0.95
    })

    it.skip('should create new on no match', async () => {
      // When: Input name is "Completely New Company"
      // And: No similar companies exist
      // Then: Suggested action should be CREATE_NEW
      // And: Confidence should be < 0.50
    })
  })

  describe('Person Matching Scenarios', () => {
    it.skip('should auto-link on exact email match', async () => {
      // When: Input has email "john@acme.com"
      // And: Canonical person exists with email "john@acme.com"
      // Then: Suggested action should be AUTO_LINK
      // And: Confidence should be >= 0.99
    })

    it.skip('should suggest merge on name + company match', async () => {
      // When: Input is "John Smith" at "Acme Corp"
      // And: Canonical person "John Smith" exists at "Acme Corp"
      // Then: Suggested action should be SUGGEST_MERGE
      // And: Confidence should be between 0.70 and 0.95
    })

    it.skip('should save provisional on name-only match', async () => {
      // When: Input is "John Smith" with no other signals
      // And: Canonical person "John Smith" exists (different company)
      // Then: Suggested action should be SAVE_PROVISIONAL
      // And: Confidence should be between 0.50 and 0.70
    })
  })
})
