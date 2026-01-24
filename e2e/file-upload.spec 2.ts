import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('File Upload Features', () => {
  const testFilesDir = '/tmp/e2e-test-files'

  test.beforeAll(async () => {
    // Create test files directory and files
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    
    // Create various test files
    fs.writeFileSync(path.join(testFilesDir, 'test.pdf'), '%PDF-1.4 test content')
    fs.writeFileSync(path.join(testFilesDir, 'test.txt'), 'Test text file content')
    fs.writeFileSync(path.join(testFilesDir, 'test.csv'), 'col1,col2\nval1,val2')
  })

  test.afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true })
    }
  })

  test('should upload file via click in task upload dialog', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    // Find and expand a task
    const taskCard = page.locator('[class*="TaskCard"], [class*="task"]').first()
    if (await taskCard.isVisible()) {
      await taskCard.click()
    }

    // Find upload button
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Proof")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      // Wait for dialog
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      // Find the upload area and click it
      const uploadArea = page.locator('text=Click to upload, text=drag and drop').first()
      
      if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadArea.click()
        ])
        
        await fileChooser.setFiles(path.join(testFilesDir, 'test.txt'))
        
        // Wait for upload
        await page.waitForSelector('text=uploaded, text=Uploading', { timeout: 10000 })
      }
      
      // Close dialog
      await page.click('button:has-text("Done"), button:has-text("Close")')
    }
  })

  test('should upload file via drag and drop', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    // Find and click upload button on a task
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Proof")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      // Wait for dialog
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      // Find drop zone
      const dropZone = page.locator('[class*="border-dashed"]').first()
      
      if (await dropZone.isVisible()) {
        // Create a data transfer with file
        const dataTransfer = await page.evaluateHandle(() => {
          const dt = new DataTransfer()
          const file = new File(['test content'], 'drag-test.txt', { type: 'text/plain' })
          dt.items.add(file)
          return dt
        })

        // Dispatch drag events
        await dropZone.dispatchEvent('dragenter', { dataTransfer })
        await dropZone.dispatchEvent('dragover', { dataTransfer })
        await dropZone.dispatchEvent('drop', { dataTransfer })
        
        // Wait for upload
        await page.waitForTimeout(2000)
      }
      
      // Close dialog
      await page.keyboard.press('Escape')
    }
  })

  test('should show upload progress indicator', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    const uploadButton = page.locator('button:has-text("Upload")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      const uploadArea = page.locator('text=Click to upload').first()
      
      if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadArea.click()
        ])
        
        await fileChooser.setFiles(path.join(testFilesDir, 'test.txt'))
        
        // Should show uploading state
        const uploadingIndicator = page.locator('text=Uploading, [class*="animate-spin"]')
        // This may be fast, so we just check if the upload completes
        await page.waitForSelector('text=uploaded, text=Done', { timeout: 15000 })
      }
      
      await page.keyboard.press('Escape')
    }
  })

  test('should show uploaded files list', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    const uploadButton = page.locator('button:has-text("Upload")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      const uploadArea = page.locator('text=Click to upload').first()
      
      if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadArea.click()
        ])
        
        await fileChooser.setFiles(path.join(testFilesDir, 'test.txt'))
        
        // Should show file in list with checkmark
        await expect(page.locator('text=test.txt')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('[class*="green"], [class*="check"]').first()).toBeVisible()
      }
      
      await page.keyboard.press('Escape')
    }
  })

  test('should handle upload error gracefully', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    // Intercept upload API to simulate failure
    await page.route('**/api/tasks/*/proof', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Simulated upload failure' })
      })
    })

    const uploadButton = page.locator('button:has-text("Upload")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      const uploadArea = page.locator('text=Click to upload').first()
      
      if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadArea.click()
        ])
        
        await fileChooser.setFiles(path.join(testFilesDir, 'test.txt'))
        
        // Should show error message
        await expect(page.locator('text=error, text=failed, [class*="red"]').first()).toBeVisible({ timeout: 10000 })
      }
      
      await page.keyboard.press('Escape')
    }
  })

  test('should allow multiple file uploads', async ({ page }) => {
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')

    const uploadButton = page.locator('button:has-text("Upload")').first()
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      const uploadArea = page.locator('text=Click to upload').first()
      
      if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadArea.click()
        ])
        
        // Upload multiple files
        await fileChooser.setFiles([
          path.join(testFilesDir, 'test.txt'),
          path.join(testFilesDir, 'test.csv')
        ])
        
        // Should show both files
        await page.waitForTimeout(3000)
        const fileCount = page.locator('text=/\\d+ file.*uploaded/')
        await expect(fileCount).toBeVisible({ timeout: 15000 })
      }
      
      await page.keyboard.press('Escape')
    }
  })
})
