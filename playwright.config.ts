import { defineConfig, devices } from '@playwright/test'

/**
 * ExitOSx E2E Test Configuration
 *
 * Run against staging: npm run test:e2e
 * Run against localhost: npm run test:e2e:local
 */

const baseURL = process.env.TEST_BASE_URL || 'https://staging.exitosx.com'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Setup project - handles authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Main tests - run after setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile tests
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Local dev server (only used when TEST_BASE_URL is localhost)
  webServer: baseURL.includes('localhost') ? {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,
})
