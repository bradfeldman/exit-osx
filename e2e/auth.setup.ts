import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

/**
 * Authentication setup - runs before all tests
 * Logs in and saves the session state for reuse
 */
setup('authenticate', async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL
  const testPassword = process.env.TEST_USER_PASSWORD

  if (!testEmail || !testPassword) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required.\n' +
      'Run with: TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpass npx playwright test'
    )
  }

  console.log(`Attempting login with email: ${testEmail}`)

  // Go to login page
  await page.goto('/login')

  // Wait for page to fully load
  await page.waitForLoadState('networkidle')

  // Wait for login form to be ready using specific IDs
  await expect(page.locator('#email')).toBeVisible({ timeout: 10000 })

  // Fill in credentials using specific IDs
  await page.fill('#email', testEmail)
  await page.fill('#password', testPassword)

  // Click sign in button
  await page.click('button[type="submit"]')

  // Wait a moment for the request to process
  await page.waitForTimeout(2000)

  // Check for error message first
  const errorMessage = page.locator('.text-red-600, [class*="error"], [class*="red"]')
  if (await errorMessage.isVisible()) {
    const errorText = await errorMessage.textContent()
    throw new Error(`Login failed with error: ${errorText}`)
  }

  // Wait for redirect to dashboard (successful login)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })

  // Wait for page to load
  await page.waitForLoadState('networkidle')

  // Verify we're logged in by checking for dashboard content
  await expect(page.locator('h1, h2, nav').first()).toBeVisible({ timeout: 10000 })

  console.log('Login successful, saving auth state')

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
