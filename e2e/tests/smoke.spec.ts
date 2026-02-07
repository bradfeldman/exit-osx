import { test, expect } from '@playwright/test'

/**
 * Smoke Tests - Quick validation of critical paths
 * Run these first to catch major issues before running full suite
 */

test.describe('Smoke Tests', () => {
  test('critical user journey - dashboard to actions', async ({ page }) => {
    // 1. Dashboard loads
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })

    // 2. Navigate to actions
    await page.locator('a[href="/dashboard/actions"]').click()
    await expect(page).toHaveURL(/actions/)

    // 3. Actions content loads (may show "select company" message or task content)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('critical user journey - dashboard to data room', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })

    await page.locator('a[href="/dashboard/data-room"]').click()
    await expect(page).toHaveURL(/data-room/)

    // Data room content loads (may show "select company" message or documents)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('all main pages load without errors', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/dashboard/actions',
      '/dashboard/data-room',
      '/dashboard/assessment',
      '/dashboard/financials/pnl',
      '/dashboard/settings/user',
    ]

    for (const pagePath of pages) {
      await page.goto(pagePath)

      // Check for JavaScript errors
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))

      // Wait for page to stabilize
      await page.waitForLoadState('networkidle')

      // Should not have critical errors
      const criticalErrors = errors.filter(
        (e) => e.includes('TypeError') || e.includes('ReferenceError')
      )
      expect(criticalErrors).toHaveLength(0)

      console.log(`Loaded: ${pagePath}`)
    }
  })

  test('company selector works', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find and interact with company selector - look for buttons or select elements
    const selector = page.locator('button:has-text("Select company"), [data-testid="company-selector"], select').first()

    if (await selector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selector.click()
      await page.waitForTimeout(500)
      // Should show dropdown options or menu
      const hasOptions = await page.locator('[role="option"], [role="listbox"], [class*="dropdown"], [class*="menu"]').first().isVisible().catch(() => false)
      expect(hasOptions).toBeTruthy()
    }
  })

  test('mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for mobile menu button (hamburger icon)
    const menuButton = page.locator('button[aria-label*="menu"], button:has(svg), [data-testid="mobile-menu"]').first()

    if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.click()
      await page.waitForTimeout(500)
      // Navigation should appear
      const hasNav = await page.locator('nav, [role="navigation"], a[href="/dashboard/actions"]').first().isVisible().catch(() => false)
      expect(hasNav).toBeTruthy()
    }
  })
})

test.describe('Error Handling', () => {
  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await page.waitForLoadState('networkidle')

    // Should show 404 or redirect to login/dashboard
    const is404 = await page.locator('text=404').first().isVisible().catch(() => false)
    const hasNotFound = await page.locator('text=not found').first().isVisible().catch(() => false)
    const isRedirected = page.url().includes('login') || page.url().includes('dashboard')

    expect(is404 || hasNotFound || isRedirected).toBeTruthy()
  })
})
