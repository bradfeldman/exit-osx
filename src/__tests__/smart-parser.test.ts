import { describe, it, expect } from 'vitest'
import {
  parseInput,
  parseLinkedInUrl,
  parseVCard,
  parseBulkInput,
} from '@/lib/contact-system/smart-parser'

describe('Smart Parser', () => {
  describe('parseInput', () => {
    it('should extract email addresses', () => {
      const input = 'Contact me at john.smith@acmecorp.com'
      const result = parseInput(input)

      expect(result.emails).toContain('john.smith@acmecorp.com')
    })

    it('should extract multiple email addresses', () => {
      const input = 'john@acme.com and jane@bigco.com'
      const result = parseInput(input)

      expect(result.emails).toHaveLength(2)
      expect(result.emails).toContain('john@acme.com')
      expect(result.emails).toContain('jane@bigco.com')
    })

    it('should extract phone numbers', () => {
      const input = 'Call me at (555) 123-4567 or 555.987.6543'
      const result = parseInput(input)

      expect(result.phones).toHaveLength(2)
      expect(result.phones).toContain('(555) 123-4567')
      expect(result.phones).toContain('(555) 987-6543')
    })

    it('should extract LinkedIn profile URLs', () => {
      const input = 'Find me on https://linkedin.com/in/johnsmith'
      const result = parseInput(input)

      expect(result.linkedInUrls).toContain('https://linkedin.com/in/johnsmith')
    })

    it('should extract LinkedIn company URLs', () => {
      const input = 'Our company: https://linkedin.com/company/acme-corp'
      const result = parseInput(input)

      expect(result.linkedInUrls).toContain('https://linkedin.com/company/acme-corp')
    })

    it('should extract domains from business emails', () => {
      const input = 'john@acmecorp.com'
      const result = parseInput(input)

      expect(result.domains).toContain('acmecorp.com')
    })

    it('should not extract domains from personal email providers', () => {
      const input = 'john@gmail.com'
      const result = parseInput(input)

      expect(result.domains).not.toContain('gmail.com')
    })

    it('should parse an email signature', () => {
      const input = `
John Smith
Vice President of Business Development
Acme Corporation
john.smith@acmecorp.com
(555) 123-4567
https://linkedin.com/in/johnsmith
      `
      const result = parseInput(input)

      expect(result.people).toHaveLength(1)
      expect(result.people[0].firstName).toBe('John')
      expect(result.people[0].lastName).toBe('Smith')
      expect(result.people[0].email).toBe('john.smith@acmecorp.com')
      expect(result.people[0].phone).toBe('(555) 123-4567')
      expect(result.people[0].title).toContain('Vice President')
    })

    it('should extract company from email signature', () => {
      const input = `
Jane Doe
Senior Partner
KKR & Co Inc.
jane@kkr.com
      `
      const result = parseInput(input)

      expect(result.companies).toHaveLength(1)
      expect(result.companies[0].name).toContain('KKR')
    })

    it('should handle empty input', () => {
      const result = parseInput('')

      expect(result.emails).toHaveLength(0)
      expect(result.phones).toHaveLength(0)
      expect(result.people).toHaveLength(0)
      expect(result.companies).toHaveLength(0)
    })

    it('should derive name from email when no name found', () => {
      const input = 'john.smith@company.com'
      const result = parseInput(input)

      expect(result.people).toHaveLength(1)
      expect(result.people[0].firstName).toBe('John')
      expect(result.people[0].lastName).toBe('Smith')
    })

    it('should calculate confidence based on available data', () => {
      const fullSignature = `
John Smith
CEO
Acme Corp
john@acme.com
linkedin.com/in/johnsmith
      `
      const minimalInput = 'john@acme.com'

      const fullResult = parseInput(fullSignature)
      const minimalResult = parseInput(minimalInput)

      expect(fullResult.people[0].confidence).toBeGreaterThan(minimalResult.people[0].confidence)
    })
  })

  describe('parseLinkedInUrl', () => {
    it('should identify person profile URLs', () => {
      const result = parseLinkedInUrl('https://linkedin.com/in/johnsmith')

      expect(result.type).toBe('person')
      expect(result.identifier).toBe('johnsmith')
    })

    it('should identify company page URLs', () => {
      const result = parseLinkedInUrl('https://linkedin.com/company/acme-corp')

      expect(result.type).toBe('company')
      expect(result.identifier).toBe('acme-corp')
    })

    it('should handle URLs with www prefix', () => {
      const result = parseLinkedInUrl('https://www.linkedin.com/in/johnsmith')

      expect(result.type).toBe('person')
      expect(result.identifier).toBe('johnsmith')
    })

    it('should handle URLs without protocol', () => {
      const result = parseLinkedInUrl('linkedin.com/in/johnsmith')

      expect(result.type).toBe('person')
      expect(result.identifier).toBe('johnsmith')
    })

    it('should return unknown for invalid URLs', () => {
      const result = parseLinkedInUrl('https://linkedin.com/jobs')

      expect(result.type).toBe('unknown')
      expect(result.identifier).toBeNull()
    })

    it('should handle usernames with hyphens and underscores', () => {
      const result = parseLinkedInUrl('https://linkedin.com/in/john-smith_123')

      expect(result.type).toBe('person')
      expect(result.identifier).toBe('john-smith_123')
    })
  })

  describe('parseVCard', () => {
    it('should parse a standard vCard', () => {
      const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:John Smith
N:Smith;John;;;
EMAIL:john@acme.com
TEL:+1-555-123-4567
ORG:Acme Corporation
TITLE:CEO
END:VCARD
      `
      const result = parseVCard(vcard)

      expect(result).not.toBeNull()
      expect(result?.firstName).toBe('John')
      expect(result?.lastName).toBe('Smith')
      expect(result?.email).toBe('john@acme.com')
      expect(result?.phone).toBe('+1-555-123-4567')
      expect(result?.company).toBe('Acme Corporation')
      expect(result?.title).toBe('CEO')
    })

    it('should handle vCard with LinkedIn URL', () => {
      const vcard = `
BEGIN:VCARD
FN:Jane Doe
EMAIL:jane@company.com
URL:https://linkedin.com/in/janedoe
END:VCARD
      `
      const result = parseVCard(vcard)

      expect(result?.linkedInUrl).toBe('https://linkedin.com/in/janedoe')
    })

    it('should return null for invalid vCard', () => {
      const result = parseVCard('not a vcard')

      expect(result).toBeNull()
    })

    it('should have high confidence for vCard data', () => {
      const vcard = `
BEGIN:VCARD
FN:John Smith
EMAIL:john@acme.com
END:VCARD
      `
      const result = parseVCard(vcard)

      expect(result?.confidence).toBe(0.9)
    })
  })

  describe('parseBulkInput', () => {
    it('should parse CSV-style input', () => {
      const input = `Name, Email, Company
John Smith, john@acme.com, Acme Corp
Jane Doe, jane@bigco.com, Big Co`

      const results = parseBulkInput(input)

      expect(results).toHaveLength(2)
    })

    it('should parse entries separated by blank lines', () => {
      const input = `
John Smith
john@acme.com

Jane Doe
jane@bigco.com
      `
      const results = parseBulkInput(input)

      expect(results).toHaveLength(2)
    })

    it('should return single entry for non-bulk input', () => {
      const input = 'John Smith\njohn@acme.com'
      const results = parseBulkInput(input)

      expect(results).toHaveLength(1)
    })
  })
})
