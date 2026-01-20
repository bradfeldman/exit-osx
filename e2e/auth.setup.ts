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

  // Dismiss cookie consent banner if present
  const cookieBanner = page.locator('button:has-text("Accept All"), button:has-text("Necessary Only")')
  if (await cookieBanner.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBanner.first().click()
    await page.waitForTimeout(500)
  }

  // Wait for login form to be ready - try multiple selectors
  const emailInput = page.locator('#email, input[type="email"], input[name="email"]').first()
  await expect(emailInput).toBeVisible({ timeout: 10000 })

  // Fill in credentials
  await emailInput.fill(testEmail)
  const passwordInput = page.locator('#password, input[type="password"], input[name="password"]').first()
  await passwordInput.fill(testPassword)

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
