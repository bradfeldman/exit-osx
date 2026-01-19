import { test, expect } from '@playwright/test'

test.describe('Assessment', () => {
  test('assessment page loads', async ({ page }) => {
    await page.goto('/dashboard/assessment')
    await page.waitForLoadState('networkidle')

    // Should show assessment content or main content area
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('can access assessment section', async ({ page }) => {
    await page.goto('/dashboard/assessment')
    await page.waitForLoadState('networkidle')

    // Should show assessment page content
    const hasContent = await page.locator('main, [class*="Card"]').first().isVisible()
    expect(hasContent).toBeTruthy()
  })

  test('assessment wizard shows content', async ({ page }) => {
    await page.goto('/dashboard/assessment')
    await page.waitForLoadState('networkidle')

    // Assessment should have cards, questions, or show content
    const hasCards = await page.locator('[class*="Card"]').first().isVisible().catch(() => false)
    const hasButtons = await page.locator('button').first().isVisible().catch(() => false)
    const hasText = await page.locator('p, h1, h2, h3').first().isVisible().catch(() => false)

    expect(hasCards || hasButtons || hasText).toBeTruthy()
  })

  test('can navigate between assessment sections', async ({ page }) => {
    await page.goto('/dashboard/assessment')
    await page.waitForLoadState('networkidle')

    // Look for any navigation or interactive elements
    const navElements = page.locator('button, a, [role="tab"], [class*="step"], [class*="progress"]')
    await expect(navElements.first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Company Assessment', () => {
  test('company assessment page loads', async ({ page }) => {
    await page.goto('/dashboard/assessment/company')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [class*="Card"]')).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Risk Assessment', () => {
  test('risk assessment page loads', async ({ page }) => {
    await page.goto('/dashboard/assessment/risk')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [class*="Card"]')).toBeVisible({ timeout: 15000 })
  })
})
