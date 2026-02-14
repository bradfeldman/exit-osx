import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanyContextBlock } from '@/components/actions/CompanyContextBlock'
import type { CompanyContextData } from '@/lib/playbook/rich-task-description'

// ─── Mock next/link ─────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: { children: React.ReactNode; href: string; onClick?: () => void; [key: string]: unknown }) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}))

// ─── Mock analytics ─────────────────────────────────────────────────────

vi.mock('@/lib/analytics', () => ({
  analytics: { track: vi.fn() },
}))

// ─── Fixtures ───────────────────────────────────────────────────────────

const HIGH_CONTEXT: CompanyContextData = {
  yourSituation: {
    metric: 'EBITDA Margin',
    value: '20.0%',
    source: 'From your FY2025 P&L',
  },
  industryBenchmark: {
    range: '15-30%',
    source: 'Application Software sector data',
  },
  financialImpact: {
    gapDescription: 'Your margin is within the industry range',
    dollarImpact: 'Value gap: $500,000',
    enterpriseValueImpact: 'At 4x-8x EBITDA',
    calculation: 'Margin: 20.0% vs industry 15-30%',
  },
  contextNote: 'Based on your Application Software financials and industry benchmarks.',
  dataQuality: 'HIGH',
  addFinancialsCTA: false,
}

const MODERATE_CONTEXT: CompanyContextData = {
  yourSituation: {
    metric: 'Assessment',
    value: 'Based on your business profile',
    source: 'From your assessment data',
  },
  industryBenchmark: {
    range: '15-30% EBITDA margin typical',
    source: 'Application Software sector data',
  },
  financialImpact: null,
  contextNote: 'Add your financials to see specific dollar impact for this task.',
  dataQuality: 'MODERATE',
  addFinancialsCTA: true,
}

const LOW_CONTEXT: CompanyContextData = {
  yourSituation: {
    metric: 'Assessment',
    value: 'Limited data available',
    source: 'From your assessment',
  },
  industryBenchmark: null,
  financialImpact: null,
  contextNote: 'Add your financials to unlock personalized insights and dollar impact.',
  dataQuality: 'LOW',
  addFinancialsCTA: true,
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('CompanyContextBlock', () => {
  it('returns null when companyContext is null', () => {
    const { container } = render(
      <CompanyContextBlock companyContext={null} taskId="task-1" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when companyContext is undefined', () => {
    const { container } = render(
      <CompanyContextBlock companyContext={undefined} taskId="task-1" />
    )
    expect(container.firstChild).toBeNull()
  })

  describe('HIGH tier', () => {
    it('renders YOUR NUMBERS header', () => {
      render(<CompanyContextBlock companyContext={HIGH_CONTEXT} taskId="task-1" />)
      expect(screen.getByText('YOUR NUMBERS')).toBeInTheDocument()
    })

    it('renders the situation metric and value', () => {
      render(<CompanyContextBlock companyContext={HIGH_CONTEXT} taskId="task-1" />)
      expect(screen.getByText('20.0%')).toBeInTheDocument()
      expect(screen.getByText('From your FY2025 P&L')).toBeInTheDocument()
    })

    it('renders industry benchmark', () => {
      render(<CompanyContextBlock companyContext={HIGH_CONTEXT} taskId="task-1" />)
      expect(screen.getByText('15-30%')).toBeInTheDocument()
    })

    it('renders financial impact', () => {
      render(<CompanyContextBlock companyContext={HIGH_CONTEXT} taskId="task-1" />)
      expect(screen.getByText('Your margin is within the industry range')).toBeInTheDocument()
      expect(screen.getByText('Value gap: $500,000')).toBeInTheDocument()
    })

    it('renders context note', () => {
      render(<CompanyContextBlock companyContext={HIGH_CONTEXT} taskId="task-1" />)
      expect(screen.getByText(/Based on your Application Software/)).toBeInTheDocument()
    })

    it('renders without crash when benchmarks are null', () => {
      const ctx: CompanyContextData = {
        ...HIGH_CONTEXT,
        industryBenchmark: null,
      }
      const { container } = render(
        <CompanyContextBlock companyContext={ctx} taskId="task-1" />
      )
      expect(container.firstChild).not.toBeNull()
      expect(screen.getByText('YOUR NUMBERS')).toBeInTheDocument()
      // Benchmark section should not render
      expect(screen.queryByText('Industry range:')).not.toBeInTheDocument()
    })

    it('renders without crash when financialImpact is null', () => {
      const ctx: CompanyContextData = {
        ...HIGH_CONTEXT,
        financialImpact: null,
      }
      const { container } = render(
        <CompanyContextBlock companyContext={ctx} taskId="task-1" />
      )
      expect(container.firstChild).not.toBeNull()
      expect(screen.getByText('YOUR NUMBERS')).toBeInTheDocument()
      // Impact section should not render
      expect(screen.queryByText('Value gap:')).not.toBeInTheDocument()
    })
  })

  describe('MODERATE tier', () => {
    it('renders YOUR CONTEXT header', () => {
      render(<CompanyContextBlock companyContext={MODERATE_CONTEXT} taskId="task-1" />)
      expect(screen.getByText('YOUR CONTEXT')).toBeInTheDocument()
    })

    it('renders the CTA link', () => {
      render(<CompanyContextBlock companyContext={MODERATE_CONTEXT} taskId="task-1" />)
      const link = screen.getByText(/Add your financials to see dollar impact/)
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/dashboard/financials/statements')
    })

    it('renders context note', () => {
      render(<CompanyContextBlock companyContext={MODERATE_CONTEXT} taskId="task-1" />)
      expect(screen.getByText(/Add your financials to see specific dollar impact/)).toBeInTheDocument()
    })
  })

  describe('LOW tier', () => {
    it('renders blurred preview with placeholder text', () => {
      render(<CompanyContextBlock companyContext={LOW_CONTEXT} taskId="task-1" />)
      // The blurred section has "YOUR NUMBERS" text
      expect(screen.getByText('YOUR NUMBERS')).toBeInTheDocument()
    })

    it('renders Add Your Financials button', () => {
      render(<CompanyContextBlock companyContext={LOW_CONTEXT} taskId="task-1" />)
      const button = screen.getByText('Add Your Financials')
      expect(button).toBeInTheDocument()
      expect(button.closest('a')).toHaveAttribute('href', '/dashboard/financials/statements')
    })
  })
})
