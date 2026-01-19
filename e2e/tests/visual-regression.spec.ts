import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests
 *
 * These tests capture screenshots and compare them against baseline images
 * to detect unintended visual changes.
 *
 * First run: Creates baseline screenshots in e2e/tests/visual-regression.spec.ts-snapshots/
 * Subsequent runs: Compares against baselines and fails if differences exceed threshold
 *
 * To update baselines: npx playwright test --update-snapshots
 */

test.describe('Visual Regression - Dashboard Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for fonts and images to load
    await page.waitForLoadState('networkidle')
  })

  test('dashboard main page', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for any animations to complete
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-main.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        // Mask dynamic content that changes between runs
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="user-avatar"]'),
        page.locator('time'),
      ],
    })
  })

  test('playbook page', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('playbook.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('data room page', async ({ page }) => {
    await page.goto('/dashboard/data-room')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('data-room.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('assessment page', async ({ page }) => {
    await page.goto('/dashboard/assessment')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('assessment.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('financials page', async ({ page }) => {
    await page.goto('/dashboard/financials/pnl')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('financials-pnl.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        // Mask charts that may have slight rendering differences
        page.locator('.recharts-wrapper'),
      ],
    })
  })

  test('settings page', async ({ page }) => {
    await page.goto('/dashboard/settings/user')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('settings-user.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="user-email"]'),
        page.locator('[data-testid="user-avatar"]'),
      ],
    })
  })
})

test.describe('Visual Regression - Responsive Views', () => {
  test('dashboard - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('dashboard - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('playbook - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('playbook-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

test.describe('Visual Regression - UI Components', () => {
  test('sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Capture just the sidebar
    const sidebar = page.locator('nav, aside, [data-testid="sidebar"]').first()
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        animations: 'disabled',
      })
    }
  })

  test('header', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Capture just the header
    const header = page.locator('header').first()
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('header.png', {
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="user-avatar"]'),
        ],
      })
    }
  })

  test('company selector dropdown', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Try to open company selector
    const selector = page.locator(
      'button:has-text("Select company"), [data-testid="company-selector"], [role="combobox"]'
    ).first()

    if (await selector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selector.click()
      await page.waitForTimeout(300)

      // Capture the dropdown
      const dropdown = page.locator('[role="listbox"], [data-radix-popper-content-wrapper]').first()
      if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dropdown).toHaveScreenshot('company-selector-dropdown.png', {
          animations: 'disabled',
        })
      }
    }
  })
})

test.describe('Visual Regression - Interactive States', () => {
  test('button hover states', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const button = page.locator('button').first()
    if (await button.isVisible()) {
      // Normal state
      await expect(button).toHaveScreenshot('button-normal.png')

      // Hover state
      await button.hover()
      await page.waitForTimeout(100)
      await expect(button).toHaveScreenshot('button-hover.png')
    }
  })

  test('card hover states', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    const card = page.locator('[class*="Card"], [data-slot="card"]').first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Normal state
      await expect(card).toHaveScreenshot('card-normal.png')

      // Hover state
      await card.hover()
      await page.waitForTimeout(100)
      await expect(card).toHaveScreenshot('card-hover.png')
    }
  })
})

test.describe('Visual Regression - Auth Pages', () => {
  test('login page @no-auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    await context.clearCookies()

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    })

    await context.close()
  })

  test('register page @no-auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    await context.clearCookies()

    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('register-page.png', {
      fullPage: true,
      animations: 'disabled',
    })

    await context.close()
  })
})

test.describe('Visual Regression - Empty States', () => {
  test('empty playbook state', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Check if there's an empty state message
    const emptyState = page.locator(
      'text=No tasks, text=No company selected, text=Get started, [data-testid="empty-state"]'
    ).first()

    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page).toHaveScreenshot('playbook-empty-state.png', {
        fullPage: true,
        animations: 'disabled',
      })
    }
  })

  test('empty data room state', async ({ page }) => {
    await page.goto('/dashboard/data-room')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Check if there's an empty state
    const emptyState = page.locator(
      'text=No documents, text=No company selected, text=Upload, [data-testid="empty-state"]'
    ).first()

    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page).toHaveScreenshot('data-room-empty-state.png', {
        fullPage: true,
        animations: 'disabled',
      })
    }
  })
})

test.describe('Visual Regression - Dark Mode', () => {
  test.skip('dashboard in dark mode', async ({ page }) => {
    // Skip if dark mode is not implemented
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Try to enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

test.describe('Visual Regression - Print View', () => {
  test('dashboard print layout', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Emulate print media
    await page.emulateMedia({ media: 'print' })
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('dashboard-print.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
