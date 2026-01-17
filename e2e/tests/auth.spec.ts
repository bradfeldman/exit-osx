import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible()
  })

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in|log in|login/i }).click()

    // Should show an error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
  })

  test('redirects unauthenticated users from dashboard', async ({ browser }) => {
    // Create a new context without stored auth
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/login/)

    await context.close()
  })
})
