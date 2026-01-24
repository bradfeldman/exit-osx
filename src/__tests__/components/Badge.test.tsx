import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from '@/components/ui/badge'

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<Badge>Test</Badge>)
      const badge = screen.getByText('Test')
      expect(badge).toHaveAttribute('data-slot', 'badge')
    })

    it('should render as span by default', () => {
      render(<Badge>Test</Badge>)
      const badge = screen.getByText('Test')
      expect(badge.tagName).toBe('SPAN')
    })
  })

  describe('Variants', () => {
    it('should render default variant', () => {
      const classes = badgeVariants({ variant: 'default' })
      expect(classes).toContain('bg-primary')
    })

    it('should render secondary variant', () => {
      const classes = badgeVariants({ variant: 'secondary' })
      expect(classes).toContain('bg-secondary')
    })

    it('should render destructive variant', () => {
      const classes = badgeVariants({ variant: 'destructive' })
      expect(classes).toContain('bg-destructive')
    })

    it('should render outline variant', () => {
      const classes = badgeVariants({ variant: 'outline' })
      expect(classes).toContain('text-foreground')
    })
  })

  describe('Custom className', () => {
    it('should merge custom className', () => {
      render(<Badge className="custom-badge">Test</Badge>)
      const badge = screen.getByText('Test')
      expect(badge).toHaveClass('custom-badge')
    })
  })

  describe('asChild prop', () => {
    it('should render as child element when asChild is true', () => {
      render(
        <Badge asChild>
          <a href="/new">New Feature</a>
        </Badge>
      )
      const link = screen.getByRole('link', { name: /new feature/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/new')
    })
  })

  describe('badgeVariants', () => {
    it('should always include base styles', () => {
      const classes = badgeVariants({})
      expect(classes).toContain('inline-flex')
      expect(classes).toContain('rounded-full')
    })
  })
})
