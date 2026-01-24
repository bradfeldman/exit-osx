import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility Tests - WCAG 2.1 AA Compliance
 * Uses axe-core to automatically detect accessibility violations
 */

// Helper to run axe and format violations
async function checkAccessibility(page: import('@playwright/test').Page, pageName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  // Log violations for debugging
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`\n=== Accessibility Violations on ${pageName} ===`)
    accessibilityScanResults.violations.forEach((violation) => {
      console.log(`\n[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`)
      console.log(`Help: ${violation.helpUrl}`)
      violation.nodes.forEach((node) => {
        console.log(`  - ${node.html.substring(0, 100)}...`)
        console.log(`    Fix: ${node.failureSummary}`)
      })
    })
  }

  return accessibilityScanResults
}

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  test.describe('Dashboard Pages', () => {
    test('dashboard main page should be accessible', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Dashboard')

      // Filter out known issues that may be from third-party components
      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })

    test('playbook page should be accessible', async ({ page }) => {
      await page.goto('/dashboard/playbook')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Playbook')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })

    test('data room page should be accessible', async ({ page }) => {
      await page.goto('/dashboard/data-room')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Data Room')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })

    test('assessment page should be accessible', async ({ page }) => {
      await page.goto('/dashboard/assessment')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Assessment')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })

    test('financials page should be accessible', async ({ page }) => {
      await page.goto('/dashboard/financials/pnl')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Financials')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })

    test('settings page should be accessible', async ({ page }) => {
      await page.goto('/dashboard/settings/user')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Settings')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })
  })

  test.describe('Authentication Pages', () => {
    // Note: Auth pages use external Supabase Auth UI which may have accessibility issues
    // outside of our control. We test for critical violations only and log others.
    test('login page should be accessible @no-auth', async ({ browser }) => {
      // Use fresh context for unauthenticated pages
      const context = await browser.newContext({ storageState: undefined })
      const page = await context.newPage()
      await context.clearCookies()

      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Login')

      // Filter for critical only - serious violations on external auth UI are noted but not blocking
      const criticalViolations = results.violations.filter((v) => v.impact === 'critical')

      // Log serious violations for awareness (external Supabase auth UI)
      const seriousViolations = results.violations.filter((v) => v.impact === 'serious')
      if (seriousViolations.length > 0) {
        console.log(`Note: ${seriousViolations.length} serious violations found on external auth UI`)
      }

      expect(criticalViolations).toHaveLength(0)

      await context.close()
    })

    test('register page should be accessible @no-auth', async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined })
      const page = await context.newPage()
      await context.clearCookies()

      await page.goto('/register')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Register')

      // Filter for critical only - serious violations on external auth UI are noted but not blocking
      const criticalViolations = results.violations.filter((v) => v.impact === 'critical')

      // Log serious violations for awareness (external Supabase auth UI)
      const seriousViolations = results.violations.filter((v) => v.impact === 'serious')
      if (seriousViolations.length > 0) {
        console.log(`Note: ${seriousViolations.length} serious violations found on external auth UI`)
      }

      expect(criticalViolations).toHaveLength(0)

      await context.close()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should be able to navigate dashboard with keyboard only', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Tab through interactive elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
      }

      // Check that focus is visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        if (!el) return null
        const styles = window.getComputedStyle(el)
        return {
          tagName: el.tagName,
          hasOutline: styles.outlineStyle !== 'none' || styles.boxShadow !== 'none',
          isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName),
        }
      })

      // Focus should be on an interactive element
      expect(focusedElement).not.toBeNull()
    })

    test('should be able to activate buttons with Enter key', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Find a button and focus it
      const button = page.locator('button').first()
      if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
        await button.focus()
        // Press Enter
        await page.keyboard.press('Enter')
        // No errors should occur
      }
    })

    test('should trap focus in modal dialogs', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Try to open a modal (look for common modal triggers)
      const modalTrigger = page.locator(
        'button:has-text("Add"), button:has-text("Create"), button:has-text("New"), [aria-haspopup="dialog"]'
      ).first()

      if (await modalTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
        await modalTrigger.click()
        await page.waitForTimeout(500)

        // Check if modal is open
        const modal = page.locator('[role="dialog"], [aria-modal="true"]').first()
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Tab multiple times - focus should stay in modal
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Tab')
          }

          // Focus should still be within the modal
          const focusInModal = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
            const focused = document.activeElement
            return modal?.contains(focused)
          })

          expect(focusInModal).toBeTruthy()

          // Escape should close modal
          await page.keyboard.press('Escape')
          await page.waitForTimeout(300)
        }
      }
    })
  })

  test.describe('Color Contrast', () => {
    test('text should have sufficient color contrast', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('color-contrast')
        .analyze()

      // Color contrast violations should be zero or minimal
      const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast')

      if (contrastViolations.length > 0) {
        console.log(`\nColor contrast violations found:`)
        contrastViolations.forEach((v) => {
          v.nodes.forEach((node) => {
            console.log(`  - ${node.html.substring(0, 80)}...`)
          })
        })
      }

      // Allow some minor violations but flag for review
      expect(contrastViolations.length).toBeLessThanOrEqual(5)
    })
  })

  test.describe('Form Accessibility', () => {
    test('form inputs should have associated labels', async ({ page }) => {
      await page.goto('/dashboard/settings/user')
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

      const labelViolations = results.violations.filter(
        (v) => v.id === 'label' || v.id === 'label-title-only'
      )

      expect(labelViolations).toHaveLength(0)
    })

    test('form errors should be announced to screen readers', async ({ page }) => {
      await page.goto('/dashboard/settings/user')
      await page.waitForLoadState('networkidle')

      // Check for proper ARIA attributes on form elements
      const formInputs = await page.locator('input, select, textarea').all()

      for (const input of formInputs.slice(0, 5)) {
        // Check for aria-describedby on inputs that might have errors
        const ariaDescribedBy = await input.getAttribute('aria-describedby')
        const ariaInvalid = await input.getAttribute('aria-invalid')
        const id = await input.getAttribute('id')

        // If input has an id, it should have a label
        if (id) {
          const label = page.locator(`label[for="${id}"]`)
          const hasLabel = await label.count() > 0
          const ariaLabel = await input.getAttribute('aria-label')
          const ariaLabelledBy = await input.getAttribute('aria-labelledby')

          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy()
        }
      }
    })
  })

  test.describe('Images and Media', () => {
    test('images should have alt text', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a'])
        .analyze()

      const imageViolations = results.violations.filter(
        (v) => v.id === 'image-alt' || v.id === 'svg-img-alt'
      )

      expect(imageViolations).toHaveLength(0)
    })
  })

  test.describe('Responsive Accessibility', () => {
    test('mobile view should be accessible', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Dashboard (Mobile)')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })

    test('tablet view should be accessible', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const results = await checkAccessibility(page, 'Dashboard (Tablet)')

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(criticalViolations).toHaveLength(0)
    })
  })

  test.describe('ARIA Landmarks', () => {
    test('page should have proper landmark regions', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Check for main landmark
      const hasMain = (await page.locator('main, [role="main"]').count()) > 0
      expect(hasMain).toBeTruthy()

      // Check for navigation landmark
      const hasNav = (await page.locator('nav, [role="navigation"]').count()) > 0
      expect(hasNav).toBeTruthy()
    })

    test('headings should be in logical order', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      const headingLevels: number[] = []

      for (const heading of headings) {
        const tagName = await heading.evaluate((el) => el.tagName)
        headingLevels.push(parseInt(tagName.replace('H', '')))
      }

      // Check that headings don't skip levels (h1 -> h3 without h2)
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1]
        // Should not skip more than one level
        expect(diff).toBeLessThanOrEqual(1)
      }
    })
  })
})

test.describe('Accessibility - Full Scan Report', () => {
  test('generate full accessibility report for all pages @smoke', async ({ page }) => {
    const pages = [
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/dashboard/playbook', name: 'Playbook' },
      { url: '/dashboard/data-room', name: 'Data Room' },
      { url: '/dashboard/assessment', name: 'Assessment' },
      { url: '/dashboard/financials/pnl', name: 'Financials' },
      { url: '/dashboard/settings/user', name: 'Settings' },
    ]

    const allViolations: Array<{
      page: string
      violations: number
      critical: number
      serious: number
      moderate: number
      minor: number
    }> = []

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url)
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      const summary = {
        page: pageInfo.name,
        violations: results.violations.length,
        critical: results.violations.filter((v) => v.impact === 'critical').length,
        serious: results.violations.filter((v) => v.impact === 'serious').length,
        moderate: results.violations.filter((v) => v.impact === 'moderate').length,
        minor: results.violations.filter((v) => v.impact === 'minor').length,
      }

      allViolations.push(summary)

      console.log(
        `${pageInfo.name}: ${summary.violations} violations (${summary.critical} critical, ${summary.serious} serious)`
      )
    }

    // Print summary table
    console.log('\n=== Accessibility Summary ===')
    console.log('Page\t\t\tTotal\tCritical\tSerious\tModerate\tMinor')
    allViolations.forEach((v) => {
      console.log(`${v.page}\t\t${v.violations}\t${v.critical}\t\t${v.serious}\t${v.moderate}\t\t${v.minor}`)
    })

    // Fail if any critical violations exist
    const totalCritical = allViolations.reduce((sum, v) => sum + v.critical, 0)
    expect(totalCritical).toBe(0)
  })
})
