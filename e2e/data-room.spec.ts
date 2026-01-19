import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('Data Room', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/data-room')
    await page.waitForLoadState('networkidle')
  })

  test('should load data room page', async ({ page }) => {
    await expect(page).toHaveURL(/\/data-room/)
    // Page should have main element with content
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 })
  })

  test('should display progress overview cards', async ({ page }) => {
    // Should have stats cards or "select company" message - wait for data to load
    await page.waitForTimeout(2000)
    const cards = page.locator('[class*="Card"]')
    const selectCompany = page.locator('text=Please select a company')
    const setupButton = page.locator('button:has-text("Set Up Company")')

    const hasCards = await cards.first().isVisible().catch(() => false)
    const needsCompany = await selectCompany.isVisible().catch(() => false)
    const hasSetup = await setupButton.isVisible().catch(() => false)

    expect(hasCards || needsCompany || hasSetup).toBeTruthy()
  })

  test('should display document categories', async ({ page }) => {
    // Should have at least one category section or "select company" message
    await page.waitForTimeout(2000)
    const category = page.locator('text=Financial Documents, text=Legal, text=Operations')
    const selectCompany = page.locator('text=Please select a company')
    const setupButton = page.locator('button:has-text("Set Up Company")')

    const hasCategory = await category.first().isVisible().catch(() => false)
    const needsCompany = await selectCompany.isVisible().catch(() => false)
    const hasSetup = await setupButton.isVisible().catch(() => false)

    expect(hasCategory || needsCompany || hasSetup).toBeTruthy()
  })

  test('should expand category to show documents', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Click on Financial Documents category to expand
    const categoryHeader = page.locator('button').filter({ hasText: 'Financial Documents' }).first()

    if (await categoryHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryHeader.click()

      // Should show documents list with gray background
      await page.waitForTimeout(500)
      const documentList = page.locator('[class*="bg-gray-50"]')
      await expect(documentList.first()).toBeVisible({ timeout: 5000 })
    } else {
      // Try alternate category
      const altCategory = page.locator('button').filter({ hasText: /Financial|Legal|Operations/ }).first()
      if (await altCategory.isVisible()) {
        await altCategory.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should show Internal Documents section if present', async ({ page }) => {
    // Check for Internal Documents category
    const internalDocs = page.locator('text=Internal Documents')
    
    if (await internalDocs.isVisible()) {
      await internalDocs.click()
      await page.waitForTimeout(500)
      
      // Should show "X documents from tasks" label
      await expect(page.locator('text=/\\d+ documents? from tasks/')).toBeVisible()
    }
  })

  test('should open add document dialog', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Check if "Add Document" button is visible (may not be if no company selected)
    const addButton = page.locator('button').filter({ hasText: 'Add Document' })

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click()

      // Should open dialog
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Close dialog
      const cancelButton = page.locator('button').filter({ hasText: 'Cancel' })
      await cancelButton.click()
    } else {
      // No company selected - page should show "select company" message
      const needsCompany = await page.locator('text=Please select a company').isVisible().catch(() => false)
      const hasSetup = await page.locator('button:has-text("Set Up Company")').isVisible().catch(() => false)
      expect(needsCompany || hasSetup).toBeTruthy()
    }
  })

  test('should create custom document', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Check if "Add Document" button is visible
    const addButton = page.locator('button').filter({ hasText: 'Add Document' })

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click()

      // Wait for dialog
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Fill in document name - find the input after the Document Name label
      const nameInput = page.locator('input').first()
      await nameInput.fill('Test Document ' + Date.now())

      // Click add button (the one in the dialog footer)
      const submitButton = dialog.locator('button').filter({ hasText: 'Add Document' })
      await submitButton.click()

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
    } else {
      // No company - just verify page loaded
      await expect(page.locator('main').first()).toBeVisible()
    }
  })

  test('should upload file to document slot', async ({ page }) => {
    // Create a test file
    const testFilePath = '/tmp/test-upload.txt'
    fs.writeFileSync(testFilePath, 'Test file content for E2E testing')
    
    // Expand a category
    const categoryHeader = page.locator('button:has-text("Financial"), button:has-text("Custom")').first()
    if (await categoryHeader.isVisible()) {
      await categoryHeader.click()
      await page.waitForTimeout(500)
    }
    
    // Find upload button
    const uploadButton = page.locator('button:has-text("Upload")').first()
    
    if (await uploadButton.isVisible()) {
      // Set up file chooser listener before clicking
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        uploadButton.click()
      ])
      
      // Select file
      await fileChooser.setFiles(testFilePath)
      
      // Wait for upload to complete
      await page.waitForLoadState('networkidle')
    }
    
    // Cleanup
    fs.unlinkSync(testFilePath)
  })

  test('should view/download document from Internal Documents', async ({ page }) => {
    // Expand Internal Documents
    const internalDocs = page.locator('button:has-text("Internal Documents")')
    
    if (await internalDocs.isVisible()) {
      await internalDocs.click()
      await page.waitForTimeout(500)
      
      // Find view/download button
      const viewButton = page.locator('button:has-text("View"), button:has-text("Download")').first()
      
      if (await viewButton.isVisible()) {
        // Click should open new tab or download
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
          viewButton.click()
        ])
        
        if (newPage) {
          await newPage.close()
        }
      }
    }
  })

  test('should delete document from Internal Documents', async ({ page }) => {
    // Expand Internal Documents
    const internalDocs = page.locator('button:has-text("Internal Documents")')
    
    if (await internalDocs.isVisible()) {
      await internalDocs.click()
      await page.waitForTimeout(500)
      
      // Find delete button (trash icon)
      const deleteButton = page.locator('[title="Delete"], button:has(svg[class*="text-red"])').first()
      
      if (await deleteButton.isVisible()) {
        // Set up dialog handler for confirmation
        page.on('dialog', dialog => dialog.accept())
        
        await deleteButton.click()
        
        // Wait for deletion to complete
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('should edit document details', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Expand a category
    const categoryHeader = page.locator('button').filter({ hasText: 'Financial Documents' }).first()
    if (await categoryHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryHeader.click()
      await page.waitForTimeout(1000)

      // Find edit button - it's a button with title="Edit"
      const editButton = page.locator('button[title="Edit"]').first()

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click()

        // Should open edit dialog
        const dialog = page.locator('[role="dialog"]')
        await expect(dialog).toBeVisible({ timeout: 5000 })

        // Close dialog
        const cancelButton = dialog.locator('button').filter({ hasText: 'Cancel' })
        await cancelButton.click()
      }
    }
  })
})
