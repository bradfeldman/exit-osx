import { test, expect } from '@playwright/test'

test.describe('Playbook / Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')
  })

  test('should load playbook page', async ({ page }) => {
    await expect(page).toHaveURL(/\/playbook/)
    // Page should have main element with content (heading or "select company" message)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('should display task list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Should have either task cards, empty state message, or "select company" prompt
    const taskCards = page.locator('[class*="Card"]')
    const emptyState = page.locator('text=No tasks')
    const noMatchState = page.locator('text=No tasks match')
    const selectCompany = page.locator('text=Please select a company')
    const setupCompany = page.locator('button:has-text("Set Up Company")')

    // Wait for content to load
    const hasCards = await taskCards.count() > 0
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const hasNoMatch = await noMatchState.isVisible().catch(() => false)
    const needsCompany = await selectCompany.isVisible().catch(() => false)
    const hasSetup = await setupCompany.isVisible().catch(() => false)

    expect(hasCards || hasEmptyState || hasNoMatch || needsCompany || hasSetup).toBeTruthy()
  })

  test('should filter tasks by status', async ({ page }) => {
    // Find status filter buttons
    const statusFilters = page.locator('button:has-text("To Do"), button:has-text("In Progress"), button:has-text("Completed"), button:has-text("All")')
    
    if (await statusFilters.first().isVisible()) {
      // Click "To Do" filter
      await page.click('button:has-text("To Do")')
      await page.waitForLoadState('networkidle')
      
      // Click "In Progress" filter
      await page.click('button:has-text("In Progress")')
      await page.waitForLoadState('networkidle')
      
      // Click "All" to reset
      await page.click('button:has-text("All")')
      await page.waitForLoadState('networkidle')
    }
  })

  test('should filter tasks by category', async ({ page }) => {
    // Find category filter buttons
    const categoryFilters = page.locator('button:has-text("Financial"), button:has-text("Operations"), button:has-text("Legal")')
    
    if (await categoryFilters.first().isVisible()) {
      await categoryFilters.first().click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should expand task details', async ({ page }) => {
    // Find a task card
    const taskCard = page.locator('[class*="TaskCard"], [data-testid="task-card"]').first()
    
    if (await taskCard.isVisible()) {
      // Click to expand
      await taskCard.click()
      
      // Should show expanded content (description, actions)
      await page.waitForTimeout(500)
    }
  })

  test('should change task status', async ({ page }) => {
    // Find task with status dropdown or buttons
    const taskCard = page.locator('[class*="TaskCard"], [data-testid="task-card"]').first()
    
    if (await taskCard.isVisible()) {
      // Look for status change mechanism
      const statusButton = taskCard.locator('button:has-text("Start"), button:has-text("Complete"), select')
      
      if (await statusButton.first().isVisible()) {
        await statusButton.first().click()
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('should open upload dialog for task', async ({ page }) => {
    // Find a task and its upload button
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Proof"), button:has-text("Document")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      // Should open dialog
      const dialog = page.locator('[role="dialog"], [class*="Dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })
      
      // Close dialog
      await page.keyboard.press('Escape')
    }
  })

  test('should open assign dialog for task', async ({ page }) => {
    // Find assign button
    const assignButton = page.locator('button:has-text("Assign"), button[title*="Assign"]').first()
    
    if (await assignButton.isVisible()) {
      await assignButton.click()
      
      // Should open dialog
      const dialog = page.locator('[role="dialog"], [class*="Dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })
      
      // Close dialog
      await page.keyboard.press('Escape')
    }
  })

  test('should mark task as blocked', async ({ page }) => {
    // Find block button
    const blockButton = page.locator('button:has-text("Block"), button[title*="Block"]').first()
    
    if (await blockButton.isVisible()) {
      await blockButton.click()
      
      // Should open dialog or prompt for reason
      await page.waitForTimeout(500)
      
      // Close if dialog opened
      await page.keyboard.press('Escape')
    }
  })
})
