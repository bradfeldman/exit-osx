import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('dashboard loads with company data', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]').or(page.getByRole('main'))).toBeVisible()

    // Should show company selector or company name
    await expect(
      page.getByText(/select.*company/i)
        .or(page.locator('[data-testid="company-selector"]'))
        .or(page.getByRole('combobox'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to playbook', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on playbook link in sidebar/nav
    await page.getByRole('link', { name: /playbook|action/i }).click()

    await expect(page).toHaveURL(/playbook/)
  })

  test('can navigate to data room', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('link', { name: /data room/i }).click()

    await expect(page).toHaveURL(/data-room/)
  })

  test('can navigate to settings', async ({ page }) => {
    await page.goto('/dashboard')

    // Settings might be in a dropdown or direct link
    const settingsLink = page.getByRole('link', { name: /settings/i })
    if (await settingsLink.isVisible()) {
      await settingsLink.click()
      await expect(page).toHaveURL(/settings/)
    }
  })

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard')

    // Check main navigation items exist
    const navItems = [
      /dashboard/i,
      /playbook|action/i,
      /data room/i,
      /financials/i,
    ]

    for (const item of navItems) {
      await expect(page.getByRole('link', { name: item })).toBeVisible()
    }
  })
})
