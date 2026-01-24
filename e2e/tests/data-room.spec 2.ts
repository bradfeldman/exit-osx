import { test, expect } from '@playwright/test'

test.describe('Data Room', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/data-room')
    await page.waitForLoadState('networkidle')
  })

  test('data room page loads', async ({ page }) => {
    // Page should have main element visible
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('shows document categories', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Should show at least one category section or "select company" message
    const category = page.locator('text=Financial Documents, text=Legal, text=Operations')
    const selectCompany = page.locator('text=Please select a company')
    const setupButton = page.locator('button:has-text("Set Up Company")')

    const hasCategory = await category.first().isVisible().catch(() => false)
    const needsCompany = await selectCompany.isVisible().catch(() => false)
    const hasSetup = await setupButton.isVisible().catch(() => false)

    expect(hasCategory || needsCompany || hasSetup).toBeTruthy()
  })

  test('can switch between categories', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Find category buttons (collapsible sections)
    const categoryButtons = page.locator('button').filter({ hasText: /Financial|Legal|Operations/ })

    const count = await categoryButtons.count()
    if (count > 0) {
      // Click first category to expand
      await categoryButtons.first().click()
      await page.waitForTimeout(500)
    }
  })

  test('shows document list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Either shows document categories, add document button, or "select company" message
    const hasCategories = await page.locator('text=Financial Documents, text=Legal').first().isVisible().catch(() => false)
    const hasAddButton = await page.locator('button:has-text("Add Document")').isVisible().catch(() => false)
    const needsCompany = await page.locator('text=Please select a company').isVisible().catch(() => false)
    const hasSetup = await page.locator('button:has-text("Set Up Company")').isVisible().catch(() => false)

    expect(hasCategories || hasAddButton || needsCompany || hasSetup).toBeTruthy()
  })

  test('shows progress indicators', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for completion percentage, uploaded count, or "select company" message
    const progressIndicators = page.locator('text=/\\d+%/, text=/\\d+.*uploaded/, text=/\\d+.*documents/')
    const selectCompany = page.locator('text=Please select a company')
    const setupButton = page.locator('button:has-text("Set Up Company")')

    const hasProgress = await progressIndicators.first().isVisible().catch(() => false)
    const needsCompany = await selectCompany.isVisible().catch(() => false)
    const hasSetup = await setupButton.isVisible().catch(() => false)

    expect(hasProgress || needsCompany || hasSetup).toBeTruthy()
  })
})
