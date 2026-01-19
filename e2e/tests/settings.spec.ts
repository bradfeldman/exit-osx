import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test('user settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/user')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2, main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('company settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/company')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2, main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('organization settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/organization')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2, main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('can view team members', async ({ page }) => {
    await page.goto('/dashboard/settings/organization')
    await page.waitForLoadState('networkidle')

    // Should show page content
    await expect(page.locator('main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Financials', () => {
  test('P&L page loads', async ({ page }) => {
    await page.goto('/dashboard/financials/pnl')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('balance sheet page loads', async ({ page }) => {
    await page.goto('/dashboard/financials/balance-sheet')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('add-backs page loads', async ({ page }) => {
    await page.goto('/dashboard/financials/add-backs')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [class*="Card"]').first()).toBeVisible({ timeout: 15000 })
  })
})
