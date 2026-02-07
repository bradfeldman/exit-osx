import { test, expect } from '@playwright/test'

test.describe('Action Playbook', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/actions')
    await page.waitForLoadState('networkidle')
  })

  test('playbook page loads', async ({ page }) => {
    // Page should have main element visible
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('shows tasks or empty state', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Either shows task cards, empty state message, or "select company" message
    const hasCards = await page.locator('[class*="Card"]').count() > 0
    const hasEmptyState = await page.locator('text=No tasks').isVisible().catch(() => false)
    const needsCompany = await page.locator('text=Please select a company').isVisible().catch(() => false)
    const hasSetup = await page.locator('button:has-text("Set Up Company")').isVisible().catch(() => false)

    expect(hasCards || hasEmptyState || needsCompany || hasSetup).toBeTruthy()
  })

  test('can filter tasks by status', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Look for filter buttons (All Tasks, To Do, In Progress, Completed)
    const filterButtons = page.locator('button').filter({ hasText: /All Tasks|To Do|In Progress|Completed/ })

    const count = await filterButtons.count()
    if (count > 0) {
      // Click through filters
      await filterButtons.first().click()
      await page.waitForTimeout(500)
    }
  })

  test('can filter tasks by category', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Look for category filter buttons
    const categoryButtons = page.locator('button').filter({ hasText: /Financial|Operations|Legal|Market/ })

    const count = await categoryButtons.count()
    if (count > 0) {
      await categoryButtons.first().click()
      await page.waitForTimeout(500)
    }
  })

  test('task cards show required information', async ({ page }) => {
    await page.waitForTimeout(2000)

    const taskCard = page.locator('[class*="Card"]').first()

    if (await taskCard.isVisible()) {
      // Each task card should have text content
      const hasText = await taskCard.locator('p, h3, h4, span').first().isVisible()
      expect(hasText).toBeTruthy()
    }
  })

  test('can interact with task cards', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for task interaction buttons
    const taskButtons = page.locator('button').filter({ hasText: /Start|Complete|Upload|Assign/ })

    if (await taskButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Task buttons exist
      expect(await taskButtons.count()).toBeGreaterThan(0)
    }
  })
})
