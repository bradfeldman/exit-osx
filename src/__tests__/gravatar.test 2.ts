import { describe, it, expect } from 'vitest'
import { getGravatarUrl, getInitials } from '@/lib/utils/gravatar'

describe('getGravatarUrl', () => {
  it('should generate correct gravatar URL', () => {
    const url = getGravatarUrl('test@example.com')
    expect(url).toContain('https://www.gravatar.com/avatar/')
    expect(url).toContain('s=80') // default size
    expect(url).toContain('d=mp') // default image
    expect(url).toContain('r=g') // default rating
  })

  it('should normalize email by trimming and lowercasing', () => {
    const url1 = getGravatarUrl('test@example.com')
    const url2 = getGravatarUrl('  TEST@EXAMPLE.COM  ')
    // Both should generate the same hash
    const hash1 = url1.split('/avatar/')[1].split('?')[0]
    const hash2 = url2.split('/avatar/')[1].split('?')[0]
    expect(hash1).toBe(hash2)
  })

  it('should respect custom size option', () => {
    const url = getGravatarUrl('test@example.com', { size: 200 })
    expect(url).toContain('s=200')
  })

  it('should respect custom default image option', () => {
    const url = getGravatarUrl('test@example.com', { default: 'identicon' })
    expect(url).toContain('d=identicon')
  })

  it('should respect custom rating option', () => {
    const url = getGravatarUrl('test@example.com', { rating: 'pg' })
    expect(url).toContain('r=pg')
  })

  it('should handle all options together', () => {
    const url = getGravatarUrl('test@example.com', {
      size: 150,
      default: 'robohash',
      rating: 'r',
    })
    expect(url).toContain('s=150')
    expect(url).toContain('d=robohash')
    expect(url).toContain('r=r')
  })

  it('should generate MD5 hash', () => {
    // Known MD5 hash for test@example.com (lowercase, trimmed)
    const url = getGravatarUrl('test@example.com')
    // The hash should be 32 characters (MD5)
    const hash = url.split('/avatar/')[1].split('?')[0]
    expect(hash).toHaveLength(32)
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true)
  })
})

describe('getInitials', () => {
  it('should return single initial for single name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('should return two initials for full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('should handle multiple names by using first and last', () => {
    expect(getInitials('John Michael Doe')).toBe('JD')
    expect(getInitials('John A B C Doe')).toBe('JD')
  })

  it('should uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD')
    expect(getInitials('JOHN DOE')).toBe('JD')
  })

  it('should handle leading/trailing whitespace', () => {
    expect(getInitials('  John Doe  ')).toBe('JD')
  })

  it('should handle multiple spaces between names', () => {
    expect(getInitials('John    Doe')).toBe('JD')
  })

  it('should return ? for null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('should return ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?')
  })

  it('should return ? for empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('should handle whitespace only (returns empty char)', () => {
    // Note: Whitespace-only strings return empty string after trim
    // Could be considered for improvement to return '?'
    expect(getInitials('   ')).toBe('')
  })
})
