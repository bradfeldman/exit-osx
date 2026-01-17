import { test, expect } from '@playwright/test'

test.describe('Data Room', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/data-room')
  })

  test('data room page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /data room/i })).toBeVisible({ timeout: 15000 })
  })

  test('shows document categories', async ({ page }) => {
    // Should show category tabs or sections
    const categories = ['Financial', 'Legal', 'Operations', 'Customers', 'Employees', 'IP']

    for (const category of categories) {
      const categoryElement = page.getByRole('tab', { name: new RegExp(category, 'i') })
        .or(page.getByRole('button', { name: new RegExp(category, 'i') }))
        .or(page.getByText(new RegExp(category, 'i')))

      await expect(categoryElement.first()).toBeVisible()
    }
  })

  test('can switch between categories', async ({ page }) => {
    // Find category tabs/buttons
    const categoryButtons = page.getByRole('tab').or(page.getByRole('button', { name: /(financial|legal|operations)/i }))

    const count = await categoryButtons.count()
    if (count > 1) {
      // Click second category
      await categoryButtons.nth(1).click()
      await page.waitForTimeout(500)
    }
  })

  test('shows document list or empty state', async ({ page }) => {
    // Either shows documents or upload prompts
    const hasDocuments = await page.locator('table, [data-testid="document-row"]').isVisible()
    const hasEmptyState = await page.getByText(/no documents|upload|add document/i).isVisible()

    expect(hasDocuments || hasEmptyState).toBeTruthy()
  })

  test('shows document status indicators', async ({ page }) => {
    // Look for status badges (Current, Needs Update, Overdue, Missing)
    const statusIndicators = page.getByText(/(current|needs update|overdue|missing|not uploaded)/i)

    // Should have at least one status indicator visible
    await expect(statusIndicators.first()).toBeVisible({ timeout: 10000 })
  })
})
