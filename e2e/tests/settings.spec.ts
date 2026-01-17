import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test('user settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/user')

    await expect(page.getByRole('heading', { name: /user|profile|account/i })).toBeVisible({ timeout: 15000 })
  })

  test('company settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/company')

    await expect(page.getByRole('heading', { name: /company|business/i })).toBeVisible({ timeout: 15000 })
  })

  test('organization settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/organization')

    await expect(page.getByRole('heading', { name: /organization|team/i })).toBeVisible({ timeout: 15000 })
  })

  test('can view team members', async ({ page }) => {
    await page.goto('/dashboard/settings/organization')

    // Should show team members section
    await expect(
      page.getByText(/team member|member|invite/i)
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Financials', () => {
  test('P&L page loads', async ({ page }) => {
    await page.goto('/dashboard/financials/pnl')

    await expect(page.getByRole('main')).toBeVisible()
  })

  test('balance sheet page loads', async ({ page }) => {
    await page.goto('/dashboard/financials/balance-sheet')

    await expect(page.getByRole('main')).toBeVisible()
  })

  test('add-backs page loads', async ({ page }) => {
    await page.goto('/dashboard/financials/add-backs')

    await expect(page.getByRole('main')).toBeVisible()
  })
})
