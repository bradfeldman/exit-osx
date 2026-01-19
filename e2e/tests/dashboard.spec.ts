import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('dashboard loads with company data', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Wait for dashboard to load - should have main content
    await expect(page.locator('main, [class*="Card"]')).toBeVisible({ timeout: 15000 })

    // Should show company UI or dashboard content
    const hasCompanyUI = await page.locator('button:has-text("Select company"), button:has-text("Add Company"), [class*="Card"]').first().isVisible()
    expect(hasCompanyUI).toBeTruthy()
  })

  test('can navigate to playbook', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click on playbook link in sidebar
    await page.locator('a[href="/dashboard/playbook"]').click()

    await expect(page).toHaveURL(/playbook/)
  })

  test('can navigate to data room', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.locator('a[href="/dashboard/data-room"]').click()

    await expect(page).toHaveURL(/data-room/)
  })

  test('can navigate to settings if available', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Settings might be in a dropdown or direct link
    const settingsLink = page.locator('a[href*="settings"]')
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click()
      await expect(page).toHaveURL(/settings/)
    }
  })

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check main navigation items exist in sidebar
    await expect(page.locator('a[href="/dashboard"]').filter({ hasText: 'Value Snapshot' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('a[href="/dashboard/playbook"]')).toBeVisible()
    await expect(page.locator('a[href="/dashboard/data-room"]')).toBeVisible()
  })
})
