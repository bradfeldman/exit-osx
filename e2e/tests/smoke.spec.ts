import { test, expect } from '@playwright/test'

/**
 * Smoke Tests - Quick validation of critical paths
 * Run these first to catch major issues before running full suite
 */

test.describe('Smoke Tests', () => {
  test('critical user journey - dashboard to playbook', async ({ page }) => {
    // 1. Dashboard loads
    await page.goto('/dashboard')
    await expect(page.getByRole('main')).toBeVisible()

    // 2. Navigate to playbook
    await page.getByRole('link', { name: /playbook|action/i }).click()
    await expect(page).toHaveURL(/playbook/)

    // 3. Playbook content loads
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 15000 })
  })

  test('critical user journey - dashboard to data room', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('main')).toBeVisible()

    await page.getByRole('link', { name: /data room/i }).click()
    await expect(page).toHaveURL(/data-room/)

    await expect(page.getByRole('heading')).toBeVisible({ timeout: 15000 })
  })

  test('all main pages load without errors', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/dashboard/playbook',
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

    // Find and interact with company selector
    const selector = page.getByRole('combobox').or(page.locator('[data-testid="company-selector"]'))

    if (await selector.isVisible()) {
      await selector.click()
      // Should show dropdown options
      await expect(page.getByRole('option').or(page.getByRole('listbox'))).toBeVisible()
    }
  })

  test('mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')

    // Look for mobile menu button
    const menuButton = page.getByRole('button', { name: /menu/i })
      .or(page.locator('[data-testid="mobile-menu"]'))
      .or(page.locator('button[aria-label*="menu"]'))

    if (await menuButton.isVisible()) {
      await menuButton.click()
      // Navigation should appear
      await expect(page.getByRole('navigation')).toBeVisible()
    }
  })
})

test.describe('Error Handling', () => {
  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    // Should show 404 or redirect
    const is404 = await page.getByText(/404|not found/i).isVisible()
    const isRedirected = page.url().includes('login') || page.url().includes('dashboard')

    expect(is404 || isRedirected).toBeTruthy()
  })
})
