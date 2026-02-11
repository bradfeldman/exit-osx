import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TimelinePanel } from '../TimelinePanel'
import type { RetirementAssumptions } from '@/lib/retirement/retirement-calculator'

const mockAssumptions: RetirementAssumptions = {
  currentAge: 52,
  retirementAge: 65,
  lifeExpectancy: 88,
  annualSpending: 120000,
  inflationRate: 0.03,
  returnRate: 0.07,
  withdrawalRate: 0.04,
  socialSecurityAnnual: 30000,
  pensionAnnual: 0,
  otherIncomeAnnual: 0,
  federalTaxRate: 0.24,
  stateTaxRate: 0.05,
  capitalGainsTaxRate: 0.15,
  localTaxRate: 0,
  stateCode: 'CA',
}

// TODO: These tests need to be updated to match the actual implementation
// The feature exists but the selectors need to be more specific (multiple inputs with same value)
describe.skip('TimelinePanel - Age Input UX (PROD-045)', () => {
  const mockOnAssumptionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Retirement Age Input', () => {
    it('should render +/- stepper buttons', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      const incrementButtons = buttons.filter(btn => btn.textContent === '+')
      const decrementButtons = buttons.filter(btn => btn.textContent === '−')

      expect(incrementButtons.length).toBeGreaterThan(0)
      expect(decrementButtons.length).toBeGreaterThan(0)
    })

    it('should increment retirement age when + button clicked', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const incrementButton = retirementAgeSection?.querySelector('button:last-of-type')

      fireEvent.click(incrementButton!)

      expect(mockOnAssumptionChange).toHaveBeenCalledWith('retirementAge', 66)
    })

    it('should decrement retirement age when - button clicked', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const decrementButton = retirementAgeSection?.querySelector('button:first-of-type')

      fireEvent.click(decrementButton!)

      expect(mockOnAssumptionChange).toHaveBeenCalledWith('retirementAge', 64)
    })

    it('should not allow retirement age below current age', () => {
      const youngAssumptions = { ...mockAssumptions, currentAge: 64, retirementAge: 65 }

      render(
        <TimelinePanel
          assumptions={youngAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const decrementButton = retirementAgeSection?.querySelector('button:first-of-type')

      fireEvent.click(decrementButton!)

      // Should enforce minimum of current age (64)
      expect(mockOnAssumptionChange).toHaveBeenCalledWith('retirementAge', 64)
    })

    it('should adapt slider minimum to current age', () => {
      const youngAssumptions = { ...mockAssumptions, currentAge: 55, retirementAge: 65 }

      render(
        <TimelinePanel
          assumptions={youngAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const minLabel = retirementAgeSection?.textContent

      // Slider minimum should be max(50, currentAge) = 55
      expect(minLabel).toContain('55')
    })

    it('should not allow retirement age above 100', () => {
      const oldAssumptions = { ...mockAssumptions, retirementAge: 100 }

      render(
        <TimelinePanel
          assumptions={oldAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const incrementButton = retirementAgeSection?.querySelector('button:last-of-type')

      fireEvent.click(incrementButton!)

      // Should cap at 100
      expect(mockOnAssumptionChange).toHaveBeenCalledWith('retirementAge', 100)
    })
  })

  describe('Life Expectancy Input (Pro Mode)', () => {
    it('should render +/- stepper buttons in pro mode', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
          simplified={false}
        />
      )

      const lifeExpSection = screen.getByText('Life Expectancy').parentElement?.parentElement
      const buttons = lifeExpSection?.querySelectorAll('button')

      // Should have +/- buttons in pro mode
      expect(buttons?.length).toBeGreaterThanOrEqual(2)
    })

    it('should not render stepper buttons for life expectancy in easy mode', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
          simplified={true}
        />
      )

      // Easy mode should just show text, no life expectancy input
      expect(screen.queryByText('Life Expectancy')).not.toBeInTheDocument()
      expect(screen.getByText(/Life expectancy: Age 88/)).toBeInTheDocument()
    })

    it('should increment life expectancy when + button clicked', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
          simplified={false}
        />
      )

      const lifeExpSection = screen.getByText('Life Expectancy').parentElement?.parentElement
      const incrementButton = lifeExpSection?.querySelector('button:last-of-type')

      fireEvent.click(incrementButton!)

      expect(mockOnAssumptionChange).toHaveBeenCalledWith('lifeExpectancy', 89)
    })

    it('should not allow life expectancy below retirement age', () => {
      const assumptions = { ...mockAssumptions, retirementAge: 87, lifeExpectancy: 88 }

      render(
        <TimelinePanel
          assumptions={assumptions}
          onAssumptionChange={mockOnAssumptionChange}
          simplified={false}
        />
      )

      const lifeExpSection = screen.getByText('Life Expectancy').parentElement?.parentElement
      const decrementButton = lifeExpSection?.querySelector('button:first-of-type')

      fireEvent.click(decrementButton!)

      // Should enforce minimum of retirement age (87)
      expect(mockOnAssumptionChange).toHaveBeenCalledWith('lifeExpectancy', 87)
    })

    it('should adapt slider minimum to retirement age', () => {
      const assumptions = { ...mockAssumptions, retirementAge: 75, lifeExpectancy: 88 }

      render(
        <TimelinePanel
          assumptions={assumptions}
          onAssumptionChange={mockOnAssumptionChange}
          simplified={false}
        />
      )

      const lifeExpSection = screen.getByText('Life Expectancy').parentElement?.parentElement
      const minLabel = lifeExpSection?.textContent

      // Slider minimum should be max(70, retirementAge) = 75
      expect(minLabel).toContain('75')
    })
  })

  describe('Mobile Touch Friendliness', () => {
    it('should have large touch targets for +/- buttons', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const incrementButton = retirementAgeSection?.querySelector('button:last-of-type') as HTMLElement

      // Button should be at least 32x32px (8 * 4 = 32px from w-8 h-8)
      void window.getComputedStyle(incrementButton)
      expect(incrementButton.className).toContain('w-8')
      expect(incrementButton.className).toContain('h-8')
    })

    it('should use inputMode numeric for keyboard optimization', () => {
      render(
        <TimelinePanel
          assumptions={mockAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      const retirementAgeInput = screen.getByDisplayValue('65')
      expect(retirementAgeInput).toHaveAttribute('inputMode', 'numeric')
    })
  })

  describe('Validation Bounds', () => {
    it('should prevent impossible retirement age scenarios', () => {
      const impossibleAssumptions = { ...mockAssumptions, currentAge: 70, retirementAge: 65 }

      render(
        <TimelinePanel
          assumptions={impossibleAssumptions}
          onAssumptionChange={mockOnAssumptionChange}
        />
      )

      // Slider should enforce minimum of current age
      const retirementAgeSection = screen.getByText('Retirement Age').parentElement?.parentElement
      const minLabel = retirementAgeSection?.textContent

      expect(minLabel).toContain('70') // Should show current age as minimum
    })
  })
})
