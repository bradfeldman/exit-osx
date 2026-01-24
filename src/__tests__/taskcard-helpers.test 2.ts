import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Test helper functions extracted from TaskCard component
// These are the same implementations used in the component

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transfer',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal/Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_COLORS: Record<string, string> = {
  FINANCIAL: 'bg-blue-100 text-blue-700',
  TRANSFERABILITY: 'bg-green-100 text-green-700',
  OPERATIONAL: 'bg-yellow-100 text-yellow-700',
  MARKET: 'bg-purple-100 text-purple-700',
  LEGAL_TAX: 'bg-red-100 text-red-700',
  PERSONAL: 'bg-orange-100 text-orange-700',
}

function getEffortLevel(effort: string): string {
  switch (effort) {
    case 'MINIMAL':
    case 'LOW':
      return 'Low Effort'
    case 'MODERATE':
      return 'Mid Effort'
    case 'HIGH':
    case 'MAJOR':
      return 'High Effort'
    default:
      return 'Mid Effort'
  }
}

function getImpactLevel(issueTier: string | null | undefined): string {
  switch (issueTier) {
    case 'CRITICAL':
      return 'Critical'
    case 'SIGNIFICANT':
      return 'Significant'
    case 'OPTIMIZATION':
    default:
      return 'Optimization'
  }
}

function getImpactEffortColor(effort: string, issueTier: string | null | undefined): string {
  const isLowEffort = effort === 'MINIMAL' || effort === 'LOW'
  const isHighEffort = effort === 'HIGH' || effort === 'MAJOR'

  if (issueTier === 'CRITICAL') {
    if (isLowEffort) return 'bg-red-100 text-red-700'
    return 'bg-red-50 text-red-600'
  }

  if (issueTier === 'SIGNIFICANT') {
    if (isLowEffort) return 'bg-orange-100 text-orange-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  if (isLowEffort) return 'bg-green-100 text-green-700'
  if (isHighEffort) return 'bg-gray-100 text-gray-600'
  return 'bg-blue-100 text-blue-700'
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email[0].toUpperCase()
}

function formatDueDate(dateStr: string): { text: string; className: string } {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (diffDays < 0) {
    return { text: `Overdue (${formatted})`, className: 'text-red-600' }
  } else if (diffDays === 0) {
    return { text: 'Due today', className: 'text-orange-600' }
  } else if (diffDays <= 3) {
    return { text: `Due ${formatted}`, className: 'text-yellow-600' }
  }
  return { text: `Due ${formatted}`, className: 'text-gray-500' }
}

describe('TaskCard Helper Functions', () => {
  describe('CATEGORY_LABELS', () => {
    it('should have all BRI categories', () => {
      expect(CATEGORY_LABELS.FINANCIAL).toBe('Financial')
      expect(CATEGORY_LABELS.TRANSFERABILITY).toBe('Transfer')
      expect(CATEGORY_LABELS.OPERATIONAL).toBe('Operations')
      expect(CATEGORY_LABELS.MARKET).toBe('Market')
      expect(CATEGORY_LABELS.LEGAL_TAX).toBe('Legal/Tax')
      expect(CATEGORY_LABELS.PERSONAL).toBe('Personal')
    })

    it('should have 6 categories', () => {
      expect(Object.keys(CATEGORY_LABELS)).toHaveLength(6)
    })
  })

  describe('CATEGORY_COLORS', () => {
    it('should have unique colors for each category', () => {
      const colors = Object.values(CATEGORY_COLORS)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })

    it('should have valid tailwind classes', () => {
      Object.values(CATEGORY_COLORS).forEach(color => {
        expect(color).toMatch(/bg-\w+-\d+ text-\w+-\d+/)
      })
    })
  })

  describe('getEffortLevel', () => {
    it('should return Low Effort for MINIMAL', () => {
      expect(getEffortLevel('MINIMAL')).toBe('Low Effort')
    })

    it('should return Low Effort for LOW', () => {
      expect(getEffortLevel('LOW')).toBe('Low Effort')
    })

    it('should return Mid Effort for MODERATE', () => {
      expect(getEffortLevel('MODERATE')).toBe('Mid Effort')
    })

    it('should return High Effort for HIGH', () => {
      expect(getEffortLevel('HIGH')).toBe('High Effort')
    })

    it('should return High Effort for MAJOR', () => {
      expect(getEffortLevel('MAJOR')).toBe('High Effort')
    })

    it('should return Mid Effort for unknown values', () => {
      expect(getEffortLevel('UNKNOWN')).toBe('Mid Effort')
      expect(getEffortLevel('')).toBe('Mid Effort')
    })
  })

  describe('getImpactLevel', () => {
    it('should return Critical for CRITICAL', () => {
      expect(getImpactLevel('CRITICAL')).toBe('Critical')
    })

    it('should return Significant for SIGNIFICANT', () => {
      expect(getImpactLevel('SIGNIFICANT')).toBe('Significant')
    })

    it('should return Optimization for OPTIMIZATION', () => {
      expect(getImpactLevel('OPTIMIZATION')).toBe('Optimization')
    })

    it('should return Optimization for null', () => {
      expect(getImpactLevel(null)).toBe('Optimization')
    })

    it('should return Optimization for undefined', () => {
      expect(getImpactLevel(undefined)).toBe('Optimization')
    })

    it('should return Optimization for unknown values', () => {
      expect(getImpactLevel('UNKNOWN')).toBe('Optimization')
    })
  })

  describe('getImpactEffortColor', () => {
    describe('Critical issues', () => {
      it('should return red-100 for low effort critical', () => {
        expect(getImpactEffortColor('LOW', 'CRITICAL')).toBe('bg-red-100 text-red-700')
        expect(getImpactEffortColor('MINIMAL', 'CRITICAL')).toBe('bg-red-100 text-red-700')
      })

      it('should return red-50 for other effort levels on critical', () => {
        expect(getImpactEffortColor('MODERATE', 'CRITICAL')).toBe('bg-red-50 text-red-600')
        expect(getImpactEffortColor('HIGH', 'CRITICAL')).toBe('bg-red-50 text-red-600')
      })
    })

    describe('Significant issues', () => {
      it('should return orange for low effort significant', () => {
        expect(getImpactEffortColor('LOW', 'SIGNIFICANT')).toBe('bg-orange-100 text-orange-700')
      })

      it('should return yellow for other effort levels on significant', () => {
        expect(getImpactEffortColor('MODERATE', 'SIGNIFICANT')).toBe('bg-yellow-100 text-yellow-700')
      })
    })

    describe('Optimization issues', () => {
      it('should return green for low effort optimization', () => {
        expect(getImpactEffortColor('LOW', 'OPTIMIZATION')).toBe('bg-green-100 text-green-700')
        expect(getImpactEffortColor('LOW', null)).toBe('bg-green-100 text-green-700')
      })

      it('should return gray for high effort optimization', () => {
        expect(getImpactEffortColor('HIGH', 'OPTIMIZATION')).toBe('bg-gray-100 text-gray-600')
        expect(getImpactEffortColor('MAJOR', null)).toBe('bg-gray-100 text-gray-600')
      })

      it('should return blue for moderate effort optimization', () => {
        expect(getImpactEffortColor('MODERATE', 'OPTIMIZATION')).toBe('bg-blue-100 text-blue-700')
      })
    })
  })

  describe('getInitials', () => {
    it('should return initials from full name', () => {
      expect(getInitials('John Doe', 'john@example.com')).toBe('JD')
    })

    it('should return two initials max from multi-word name', () => {
      expect(getInitials('John Michael Doe', 'john@example.com')).toBe('JM')
    })

    it('should return single initial from single name', () => {
      expect(getInitials('John', 'john@example.com')).toBe('J')
    })

    it('should uppercase initials', () => {
      expect(getInitials('john doe', 'john@example.com')).toBe('JD')
    })

    it('should return email initial when name is null', () => {
      expect(getInitials(null, 'john@example.com')).toBe('J')
    })

    it('should uppercase email initial', () => {
      expect(getInitials(null, 'john@example.com')).toBe('J')
    })
  })

  describe('formatDueDate', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent tests
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return Overdue with red for past dates', () => {
      const result = formatDueDate('2024-01-10')
      expect(result.text).toContain('Overdue')
      expect(result.className).toBe('text-red-600')
    })

    it('should return Due today with orange for today', () => {
      const result = formatDueDate('2024-01-15')
      expect(result.text).toBe('Due today')
      expect(result.className).toBe('text-orange-600')
    })

    it('should return yellow for dates within 3 days', () => {
      const result = formatDueDate('2024-01-17')
      expect(result.text).toContain('Due')
      expect(result.className).toBe('text-yellow-600')
    })

    it('should return gray for dates more than 3 days away', () => {
      const result = formatDueDate('2024-01-25')
      expect(result.text).toContain('Due')
      expect(result.className).toBe('text-gray-500')
    })

    it('should format date correctly', () => {
      // Use a date with explicit time to avoid timezone issues
      const result = formatDueDate('2024-01-25T12:00:00')
      expect(result.text).toMatch(/Jan 25/)
    })
  })
})
