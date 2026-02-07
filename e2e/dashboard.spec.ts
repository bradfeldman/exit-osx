import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should show dashboard content
    await expect(page).toHaveURL(/\/dashboard/)

    // Check for main dashboard elements - either welcome message or dashboard card
    const welcomeOrCard = page.locator('h1:has-text("Welcome"), h1:has-text("Exit OSx"), [class*="Card"]').first()
    await expect(welcomeOrCard).toBeVisible({ timeout: 15000 })
  })

  test('should display company selector or add company button', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for company selection UI or add company button in sidebar
    const companyUI = page.locator('button:has-text("Select company"), button:has-text("Add Company"), a:has-text("Add Company")').first()
    await expect(companyUI).toBeVisible({ timeout: 10000 })
  })

  test('should show dashboard content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should have either welcome card or metrics card
    const content = page.locator('[class*="Card"], [class*="card"]').first()
    await expect(content).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to actions from sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find and click actions link in sidebar
    const actionsLink = page.locator('a[href="/dashboard/actions"]')
    await actionsLink.click()

    await expect(page).toHaveURL(/\/actions/)
  })

  test('should navigate to data room from sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find and click data room link in sidebar
    const dataRoomLink = page.locator('a[href="/dashboard/data-room"]')
    await dataRoomLink.click()

    await expect(page).toHaveURL(/\/data-room/)
  })

  test('should show sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Sidebar should have main nav items (using specific link selectors)
    await expect(page.locator('a[href="/dashboard"]').filter({ hasText: 'Value Snapshot' })).toBeVisible()
    await expect(page.locator('a[href="/dashboard/actions"]')).toBeVisible()
    await expect(page.locator('a[href="/dashboard/data-room"]')).toBeVisible()
  })
})
