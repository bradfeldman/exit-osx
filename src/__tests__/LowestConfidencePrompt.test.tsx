import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LowestConfidencePrompt } from '@/components/diagnosis/LowestConfidencePrompt'

// Mock CategoryData structure matching component interface
interface CategoryData {
  category: string
  label: string
  score: number
  isAssessed: boolean
  confidence: {
    dots: number
    label: string
    questionsAnswered: number
    questionsTotal: number
  }
  isLowestConfidence: boolean
}

describe('LowestConfidencePrompt', () => {
  const createCategory = (overrides: Partial<CategoryData> = {}): CategoryData => ({
    category: 'FINANCIAL',
    label: 'Financial Strength',
    score: 70,
    isAssessed: true,
    confidence: {
      dots: 2,
      label: 'Low',
      questionsAnswered: 5,
      questionsTotal: 12,
    },
    isLowestConfidence: false,
    ...overrides,
  })

  describe('Visibility Rules', () => {
    it('should not render when no categories are assessed', () => {
      const categories = [
        createCategory({ isAssessed: false, isLowestConfidence: true }),
        createCategory({ isAssessed: false }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when no lowest confidence category exists', () => {
      const categories = [
        createCategory({ isAssessed: true, isLowestConfidence: false }),
        createCategory({ isAssessed: true, isLowestConfidence: false }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when lowest confidence category has 4 dots (high confidence)', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 4,
            label: 'High',
            questionsAnswered: 12,
            questionsTotal: 12,
          },
        }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when all questions are answered', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 3,
            label: 'Medium',
            questionsAnswered: 12,
            questionsTotal: 12, // No questions remaining
          },
        }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when lowest confidence category has < 4 dots and questions remain', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(screen.getByText('Improve Your Diagnosis Confidence')).toBeInTheDocument()
    })
  })

  describe('Content and Copy', () => {
    it('should display correct category name in message', () => {
      const categories = [
        createCategory({
          label: 'Market Position',
          category: 'MARKET',
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 1,
            label: 'Very Low',
            questionsAnswered: 2,
            questionsTotal: 10,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(screen.getByText(/Market Position/)).toBeInTheDocument()
      expect(screen.getByText(/score is based on limited data/)).toBeInTheDocument()
    })

    it('should display correct number of remaining questions (singular)', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 11,
            questionsTotal: 12, // 1 question remaining
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(screen.getByText(/Answer 1 more question/)).toBeInTheDocument()
    })

    it('should display correct number of remaining questions (plural)', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12, // 7 questions remaining
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(screen.getByText(/Answer 7 more questions/)).toBeInTheDocument()
    })

    it('should display "improve confidence and get more accurate recommendations" message', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(
        screen.getByText(/improve confidence and get more accurate recommendations/)
      ).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should render with amber warning styling', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      const card = container.querySelector('[class*="border-orange"]')
      expect(card).toBeInTheDocument()
    })

    it('should render AlertTriangle icon', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('CTA Behavior', () => {
    it('should call onExpandCategory with correct category when button is clicked', async () => {
      const onExpandCategory = vi.fn()
      const categories = [
        createCategory({
          category: 'OPERATIONAL',
          label: 'Operational Excellence',
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt
          categories={categories}
          onExpandCategory={onExpandCategory}
        />
      )

      const button = screen.getByRole('button', { name: /Answer Questions/i })
      await userEvent.click(button)

      expect(onExpandCategory).toHaveBeenCalledWith('OPERATIONAL')
      expect(onExpandCategory).toHaveBeenCalledTimes(1)
    })

    it('should render CTA button with correct text', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      const button = screen.getByRole('button', { name: /Answer Questions/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Answer Questions →')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty categories array', () => {
      const { container } = render(
        <LowestConfidencePrompt categories={[]} onExpandCategory={vi.fn()} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle multiple categories and pick the lowest confidence one', () => {
      const categories = [
        createCategory({
          category: 'FINANCIAL',
          label: 'Financial Strength',
          isAssessed: true,
          isLowestConfidence: false,
          confidence: {
            dots: 3,
            label: 'Medium',
            questionsAnswered: 8,
            questionsTotal: 12,
          },
        }),
        createCategory({
          category: 'MARKET',
          label: 'Market Position',
          isAssessed: true,
          isLowestConfidence: true, // This is the lowest
          confidence: {
            dots: 1,
            label: 'Very Low',
            questionsAnswered: 2,
            questionsTotal: 10,
          },
        }),
        createCategory({
          category: 'OPERATIONAL',
          label: 'Operational Excellence',
          isAssessed: true,
          isLowestConfidence: false,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 12,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      // Should show the Market Position category (isLowestConfidence: true)
      expect(screen.getByText(/Market Position/)).toBeInTheDocument()
    })

    it('should handle 0 questions remaining edge case', () => {
      const categories = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 12,
            questionsTotal: 12,
          },
        }),
      ]

      const { container } = render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      // Should not render when questions remaining = 0
      expect(container.firstChild).toBeNull()
    })
  })

  describe('PROD-070: Spec Compliance', () => {
    it('should match spec: identifies lowest confidence category by dots', () => {
      const categories = [
        createCategory({
          category: 'TRANSFERABILITY',
          label: 'Transferability',
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 1, // Lowest confidence
            label: 'Very Low',
            questionsAnswered: 3,
            questionsTotal: 10,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      expect(screen.getByText(/Transferability/)).toBeInTheDocument()
    })

    it('should match spec: copy includes "based on limited data"', () => {
      const categories = [
        createCategory({
          label: 'Legal & Tax',
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 4,
            questionsTotal: 10,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt categories={categories} onExpandCategory={vi.fn()} />
      )

      // Text is split across multiple elements (span + text nodes), so check both parts separately
      expect(screen.getByText('Legal & Tax')).toBeInTheDocument()
      expect(screen.getByText(/score is based on limited data/i)).toBeInTheDocument()
    })

    it('should match spec: CTA expands category assessment flow', async () => {
      const onExpandCategory = vi.fn()
      const categories = [
        createCategory({
          category: 'PERSONAL',
          label: 'Personal Readiness',
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 3,
            questionsTotal: 8,
          },
        }),
      ]

      render(
        <LowestConfidencePrompt
          categories={categories}
          onExpandCategory={onExpandCategory}
        />
      )

      const button = screen.getByRole('button', { name: /Answer Questions/i })
      await userEvent.click(button)

      // Verify CTA triggers category expansion
      expect(onExpandCategory).toHaveBeenCalledWith('PERSONAL')
    })

    it('should match spec: only shows when at least one assessment exists', () => {
      // No categories assessed
      const noAssessment = [
        createCategory({
          isAssessed: false,
          isLowestConfidence: true,
          confidence: {
            dots: 1,
            label: 'Very Low',
            questionsAnswered: 0,
            questionsTotal: 10,
          },
        }),
      ]

      const { container: container1 } = render(
        <LowestConfidencePrompt categories={noAssessment} onExpandCategory={vi.fn()} />
      )
      expect(container1.firstChild).toBeNull()

      // At least one assessed
      const hasAssessment = [
        createCategory({
          isAssessed: true,
          isLowestConfidence: true,
          confidence: {
            dots: 2,
            label: 'Low',
            questionsAnswered: 5,
            questionsTotal: 10,
          },
        }),
      ]

      const { container: container2 } = render(
        <LowestConfidencePrompt categories={hasAssessment} onExpandCategory={vi.fn()} />
      )
      expect(container2.firstChild).not.toBeNull()
    })
  })
})
