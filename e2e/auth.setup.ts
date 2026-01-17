import { test as setup, expect } from '@playwright/test'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@exitosx.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Fill in credentials
  await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
  await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD)

  // Submit login form
  await page.getByRole('button', { name: /sign in|log in|login/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 30000 })

  // Verify we're logged in
  await expect(page).toHaveURL(/dashboard/)

  // Save authentication state
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
