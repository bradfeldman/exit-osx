import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with children', () => {
      render(<Card>Card Content</Card>)
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<Card data-testid="card">Test</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('data-slot', 'card')
    })

    it('should merge custom className', () => {
      render(<Card className="custom-card" data-testid="card">Test</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-card')
    })

    it('should have base styles', () => {
      render(<Card data-testid="card">Test</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-xl')
      expect(card).toHaveClass('border')
    })
  })

  describe('CardHeader', () => {
    it('should render with children', () => {
      render(<CardHeader>Header Content</CardHeader>)
      expect(screen.getByText('Header Content')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<CardHeader data-testid="header">Test</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveAttribute('data-slot', 'card-header')
    })
  })

  describe('CardTitle', () => {
    it('should render with children', () => {
      render(<CardTitle>Card Title</CardTitle>)
      expect(screen.getByText('Card Title')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<CardTitle data-testid="title">Test</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveAttribute('data-slot', 'card-title')
    })

    it('should have font-semibold class', () => {
      render(<CardTitle data-testid="title">Test</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('font-semibold')
    })
  })

  describe('CardDescription', () => {
    it('should render with children', () => {
      render(<CardDescription>Card description text</CardDescription>)
      expect(screen.getByText('Card description text')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<CardDescription data-testid="desc">Test</CardDescription>)
      const desc = screen.getByTestId('desc')
      expect(desc).toHaveAttribute('data-slot', 'card-description')
    })

    it('should have muted-foreground text', () => {
      render(<CardDescription data-testid="desc">Test</CardDescription>)
      const desc = screen.getByTestId('desc')
      expect(desc).toHaveClass('text-muted-foreground')
    })
  })

  describe('CardContent', () => {
    it('should render with children', () => {
      render(<CardContent>Content here</CardContent>)
      expect(screen.getByText('Content here')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<CardContent data-testid="content">Test</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveAttribute('data-slot', 'card-content')
    })

    it('should have padding', () => {
      render(<CardContent data-testid="content">Test</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('px-6')
    })
  })

  describe('CardFooter', () => {
    it('should render with children', () => {
      render(<CardFooter>Footer content</CardFooter>)
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<CardFooter data-testid="footer">Test</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveAttribute('data-slot', 'card-footer')
    })

    it('should have flex layout', () => {
      render(<CardFooter data-testid="footer">Test</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('flex')
    })
  })

  describe('CardAction', () => {
    it('should render with children', () => {
      render(<CardAction>Action button</CardAction>)
      expect(screen.getByText('Action button')).toBeInTheDocument()
    })

    it('should have correct data attribute', () => {
      render(<CardAction data-testid="action">Test</CardAction>)
      const action = screen.getByTestId('action')
      expect(action).toHaveAttribute('data-slot', 'card-action')
    })
  })

  describe('Full Card Composition', () => {
    it('should render a complete card', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      )

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })
})
