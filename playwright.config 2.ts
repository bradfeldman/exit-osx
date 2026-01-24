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

  // Snapshot configuration for visual regression tests
  snapshotDir: './e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',

  // Visual comparison settings
  expect: {
    toHaveScreenshot: {
      // Allow 0.2% pixel difference (for anti-aliasing, font rendering)
      maxDiffPixelRatio: 0.002,
      // Or allow up to 100 different pixels
      maxDiffPixels: 100,
      // Threshold for color difference (0-1, lower is stricter)
      threshold: 0.2,
      // Animation timing
      animations: 'disabled',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.002,
    },
  },

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

    // No-auth project - for tests that don't require authentication
    // Use this for login/register page tests, visual regression, and performance of auth pages
    {
      name: 'no-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
      testMatch: /.*(accessibility|visual-regression|performance)\.spec\.ts/,
      grep: /@no-auth|login page|register page/,
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

  // Local dev server - disabled when server is already running
  // Set SKIP_WEB_SERVER=1 to skip auto-starting the server
  webServer: (baseURL.includes('localhost') && !process.env.SKIP_WEB_SERVER) ? {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 120 * 1000,
  } : undefined,
})
