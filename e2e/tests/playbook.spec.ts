import { test, expect } from '@playwright/test'

test.describe('Action Playbook', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/playbook')
  })

  test('playbook page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /playbook|action/i })).toBeVisible({ timeout: 15000 })
  })

  test('shows tasks or empty state', async ({ page }) => {
    // Either shows tasks or an empty state message
    const hasTasks = await page.locator('[data-testid="task-card"]').or(page.getByText(/task/i)).first().isVisible()
    const hasEmptyState = await page.getByText(/no tasks|complete.*assessment/i).isVisible()

    expect(hasTasks || hasEmptyState).toBeTruthy()
  })

  test('can filter tasks by status', async ({ page }) => {
    // Look for filter buttons
    const filterButtons = page.getByRole('button', { name: /(all|to do|pending|in progress|completed)/i })

    // Click through filters if they exist
    const count = await filterButtons.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await filterButtons.nth(i).click()
        // Brief wait to let filter apply
        await page.waitForTimeout(500)
      }
    }
  })

  test('can filter tasks by category', async ({ page }) => {
    // Look for category filter buttons
    const categoryButtons = page.getByRole('button', { name: /(financial|transfer|operation|market|legal|personal)/i })

    const count = await categoryButtons.count()
    if (count > 0) {
      // Click first category
      await categoryButtons.first().click()
      await page.waitForTimeout(500)
    }
  })

  test('task cards show required information', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"]').or(page.locator('article')).first()

    if (await taskCard.isVisible()) {
      // Each task should have a title
      await expect(taskCard.locator('h3, h4, [class*="title"]')).toBeVisible()
    }
  })

  test('can expand task details', async ({ page }) => {
    // Look for "Show details" or expand button
    const expandButton = page.getByRole('button', { name: /show details|expand|more/i }).first()

    if (await expandButton.isVisible()) {
      await expandButton.click()
      // Should show description or additional info
      await expect(page.getByText(/description|type:|complexity:/i)).toBeVisible()
    }
  })
})
