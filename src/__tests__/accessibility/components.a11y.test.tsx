/* eslint-disable @next/next/no-html-link-for-pages */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

describe('Component Accessibility Tests', () => {
  describe('Button', () => {
    it('should have no accessibility violations with default variant', async () => {
      const { container } = render(<Button>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with all variants', async () => {
      const { container } = render(
        <div>
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations when disabled', async () => {
      const { container } = render(<Button disabled>Disabled</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations as link', async () => {
      const { container } = render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Badge', () => {
    it('should have no accessibility violations with default variant', async () => {
      const { container } = render(<Badge>New</Badge>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with all variants', async () => {
      const { container } = render(
        <div>
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Card', () => {
    it('should have no accessibility violations with full composition', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with interactive elements', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <form>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email" />
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit">Submit</Button>
          </CardFooter>
        </Card>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Elements', () => {
    it('should have no accessibility violations with labeled input', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="Enter username" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with required input', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="required-field">
            Required Field <span aria-hidden="true">*</span>
          </Label>
          <Input id="required-field" required aria-required="true" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with checkbox', async () => {
      const { container } = render(
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with disabled input', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="disabled-input">Disabled Input</Label>
          <Input id="disabled-input" disabled value="Cannot edit" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with input error state', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="error-input">Email</Label>
          <Input
            id="error-input"
            type="email"
            aria-invalid="true"
            aria-describedby="error-message"
          />
          <p id="error-message" role="alert" className="text-red">
            Please enter a valid email address
          </p>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Complete Form', () => {
    it('should have no accessibility violations with a complete form', async () => {
      const { container } = render(
        <form aria-label="Contact form">
          <fieldset>
            <legend>Contact Information</legend>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" required aria-required="true" />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required aria-required="true" />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  className="w-full border rounded p-2"
                  rows={4}
                  required
                  aria-required="true"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="newsletter" />
                <Label htmlFor="newsletter">Subscribe to newsletter</Label>
              </div>
            </div>
          </fieldset>

          <Button type="submit">Send Message</Button>
        </form>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Navigation Elements', () => {
    it('should have no accessibility violations with navigation', async () => {
      const { container } = render(
        <nav aria-label="Main navigation">
          <ul role="list">
            <li>
              <a href="/dashboard">Dashboard</a>
            </li>
            <li>
              <a href="/settings">Settings</a>
            </li>
            <li>
              <a href="/profile">Profile</a>
            </li>
          </ul>
        </nav>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with button navigation', async () => {
      const { container } = render(
        <nav aria-label="Action navigation">
          <Button variant="ghost">Home</Button>
          <Button variant="ghost">About</Button>
          <Button variant="ghost">Contact</Button>
        </nav>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Content Structure', () => {
    it('should have no accessibility violations with proper heading hierarchy', async () => {
      const { container } = render(
        <main>
          <h1>Page Title</h1>
          <section aria-labelledby="section1">
            <h2 id="section1">Section One</h2>
            <p>Content for section one</p>
            <h3>Subsection</h3>
            <p>More detailed content</p>
          </section>
          <section aria-labelledby="section2">
            <h2 id="section2">Section Two</h2>
            <p>Content for section two</p>
          </section>
        </main>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with lists', async () => {
      const { container } = render(
        <div>
          <h2>Features</h2>
          <ul aria-label="Feature list">
            <li>Feature one</li>
            <li>Feature two</li>
            <li>Feature three</li>
          </ul>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Images and Icons', () => {
    it('should have no accessibility violations with decorative icons', async () => {
      const { container } = render(
        <Button>
          <span aria-hidden="true">+</span>
          Add Item
        </Button>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with icon-only button', async () => {
      const { container } = render(
        <Button aria-label="Add new item">
          <span aria-hidden="true">+</span>
        </Button>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Status Messages', () => {
    it('should have no accessibility violations with success message', async () => {
      const { container } = render(
        <div role="status" aria-live="polite">
          <Badge variant="default">Success</Badge>
          <span>Your changes have been saved.</span>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with error message', async () => {
      const { container } = render(
        <div role="alert" aria-live="assertive">
          <Badge variant="destructive">Error</Badge>
          <span>Something went wrong. Please try again.</span>
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
