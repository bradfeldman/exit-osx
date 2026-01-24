import { test, expect } from '@playwright/test'

test.describe('API Health Checks', () => {
  test('companies API responds', async ({ request }) => {
    const response = await request.get('/api/companies')

    // Should return 200 or 401 (if auth required)
    expect([200, 401]).toContain(response.status())
  })

  test('tasks API responds', async ({ request }) => {
    const response = await request.get('/api/tasks')

    expect([200, 400, 401]).toContain(response.status())
  })

  test('questions API responds', async ({ request }) => {
    const response = await request.get('/api/questions')

    expect([200, 401]).toContain(response.status())
  })

  test('organizations API responds', async ({ request }) => {
    const response = await request.get('/api/organizations')

    expect([200, 401]).toContain(response.status())
  })
})

test.describe('API Data Integrity', () => {
  test('companies endpoint returns valid JSON', async ({ request }) => {
    const response = await request.get('/api/companies')

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('companies')
      expect(Array.isArray(data.companies)).toBeTruthy()
    }
  })

  test('tasks endpoint returns valid structure', async ({ request }) => {
    const response = await request.get('/api/tasks?companyId=test')

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('tasks')
    }
  })
})

test.describe('Page Load Performance', () => {
  test('dashboard loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000)
    console.log(`Dashboard load time: ${loadTime}ms`)
  })

  test('playbook loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/dashboard/playbook')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    console.log(`Playbook load time: ${loadTime}ms`)
  })
})
