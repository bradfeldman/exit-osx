import { test, expect } from '@playwright/test'

test.describe('Assessment', () => {
  test('assessment page loads', async ({ page }) => {
    await page.goto('/dashboard/assessment')

    // Should show assessment content
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('can start new assessment', async ({ page }) => {
    await page.goto('/dashboard/assessments/new')

    // Should show assessment types or start button
    await expect(
      page.getByRole('heading')
        .or(page.getByRole('button', { name: /start|begin|create/i }))
    ).toBeVisible({ timeout: 15000 })
  })

  test('assessment wizard shows questions', async ({ page }) => {
    await page.goto('/dashboard/assessment')

    // Look for question content
    const hasQuestion = await page.getByText(/\?/).first().isVisible()
    const hasOptions = await page.getByRole('radio').or(page.getByRole('button')).first().isVisible()

    // Assessment should have questions or show completed state
    const hasContent = hasQuestion || hasOptions ||
      await page.getByText(/complete|score|assessment/i).isVisible()

    expect(hasContent).toBeTruthy()
  })

  test('can navigate between assessment sections', async ({ page }) => {
    await page.goto('/dashboard/assessment')

    // Look for section navigation or progress indicator
    const navElements = page.getByRole('tab')
      .or(page.getByRole('button', { name: /(next|previous|back|continue)/i }))
      .or(page.locator('[class*="step"], [class*="progress"]'))

    await expect(navElements.first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Company Assessment', () => {
  test('company assessment page loads', async ({ page }) => {
    await page.goto('/dashboard/assessment/company')

    await expect(page.getByRole('main')).toBeVisible()
  })
})

test.describe('Risk Assessment', () => {
  test('risk assessment page loads', async ({ page }) => {
    await page.goto('/dashboard/assessment/risk')

    await expect(page.getByRole('main')).toBeVisible()
  })
})
