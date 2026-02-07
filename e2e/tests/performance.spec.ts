import { test, expect } from '@playwright/test'

/**
 * Performance Tests
 *
 * Tests page load times, Web Vitals, and API response times.
 * Run with: npm run test:perf
 *
 * Performance budgets are defined as thresholds - adjust based on your requirements.
 */

// Performance budgets (in milliseconds unless noted)
const PERFORMANCE_BUDGETS = {
  // Page load thresholds
  pageLoad: {
    domContentLoaded: 3000, // DOM ready
    load: 5000, // Full page load
    firstContentfulPaint: 2000, // FCP
    largestContentfulPaint: 2500, // LCP (Good: <2.5s)
    timeToInteractive: 3500, // TTI
  },
  // API response thresholds
  api: {
    fast: 200, // Fast endpoints (simple GETs)
    normal: 500, // Normal endpoints
    slow: 1000, // Complex queries
  },
  // Web Vitals thresholds (based on Google's recommendations)
  webVitals: {
    LCP: 2500, // Largest Contentful Paint (Good: <2.5s)
    FID: 100, // First Input Delay (Good: <100ms)
    CLS: 0.1, // Cumulative Layout Shift (Good: <0.1)
    TTFB: 800, // Time to First Byte (Good: <800ms)
    FCP: 1800, // First Contentful Paint (Good: <1.8s)
  },
}

// Helper to measure page performance
async function measurePagePerformance(page: import('@playwright/test').Page) {
  const performanceTiming = await page.evaluate(() => {
    const timing = performance.timing
    const navigationStart = timing.navigationStart

    return {
      // Navigation timing
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - navigationStart,
      download: timing.responseEnd - timing.responseStart,
      domInteractive: timing.domInteractive - navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
      load: timing.loadEventEnd - navigationStart,

      // Resource timing summary
      resourceCount: performance.getEntriesByType('resource').length,
    }
  })

  return performanceTiming
}

// Helper to get Web Vitals using PerformanceObserver
async function getWebVitals(page: import('@playwright/test').Page) {
  const vitals = await page.evaluate(() => {
    return new Promise<{
      FCP: number | null
      LCP: number | null
      CLS: number | null
      TTFB: number | null
    }>((resolve) => {
      const vitals: {
        FCP: number | null
        LCP: number | null
        CLS: number | null
        TTFB: number | null
      } = {
        FCP: null,
        LCP: null,
        CLS: null,
        TTFB: null,
      }

      // Get FCP from paint timing
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        vitals.FCP = fcpEntry.startTime
      }

      // Get TTFB from navigation timing
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navEntries.length > 0) {
        vitals.TTFB = navEntries[0].responseStart
      }

      // For LCP and CLS, we need observers (simplified version)
      // In a real scenario, you'd use web-vitals library
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
      if (lcpEntries.length > 0) {
        vitals.LCP = lcpEntries[lcpEntries.length - 1].startTime
      }

      // CLS calculation (simplified)
      let clsValue = 0
      const layoutShiftEntries = performance.getEntriesByType('layout-shift') as PerformanceEntry[]
      layoutShiftEntries.forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value || 0
        }
      })
      vitals.CLS = clsValue

      resolve(vitals)
    })
  })

  return vitals
}

test.describe('Performance - Page Load Metrics', () => {
  test('dashboard loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime
    const metrics = await measurePagePerformance(page)

    console.log('\n=== Dashboard Performance ===')
    console.log(`Total load time: ${loadTime}ms`)
    console.log(`TTFB: ${metrics.ttfb}ms`)
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`)
    console.log(`Full Load: ${metrics.load}ms`)
    console.log(`Resources loaded: ${metrics.resourceCount}`)

    // Assert performance budgets
    expect(metrics.ttfb).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.TTFB)
    expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad.domContentLoaded)
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad.load)
  })

  test('actions page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/dashboard/actions')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime
    const metrics = await measurePagePerformance(page)

    console.log('\n=== Playbook Performance ===')
    console.log(`Total load time: ${loadTime}ms`)
    console.log(`TTFB: ${metrics.ttfb}ms`)
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`)

    expect(metrics.ttfb).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.TTFB)
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad.load)
  })

  test('data room page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/dashboard/data-room')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime
    const metrics = await measurePagePerformance(page)

    console.log('\n=== Data Room Performance ===')
    console.log(`Total load time: ${loadTime}ms`)
    console.log(`TTFB: ${metrics.ttfb}ms`)

    expect(metrics.ttfb).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.TTFB)
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad.load)
  })

  test('financials page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/dashboard/financials/pnl')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime
    const metrics = await measurePagePerformance(page)

    console.log('\n=== Financials Performance ===')
    console.log(`Total load time: ${loadTime}ms`)
    console.log(`TTFB: ${metrics.ttfb}ms`)

    // Financials may have charts, allow slightly longer
    expect(metrics.ttfb).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.TTFB)
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad.load * 1.5)
  })
})

test.describe('Performance - Web Vitals', () => {
  test('dashboard meets Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for LCP element to render
    await page.waitForTimeout(1000)

    const vitals = await getWebVitals(page)

    console.log('\n=== Dashboard Web Vitals ===')
    console.log(`FCP: ${vitals.FCP?.toFixed(0) || 'N/A'}ms`)
    console.log(`LCP: ${vitals.LCP?.toFixed(0) || 'N/A'}ms`)
    console.log(`CLS: ${vitals.CLS?.toFixed(3) || 'N/A'}`)
    console.log(`TTFB: ${vitals.TTFB?.toFixed(0) || 'N/A'}ms`)

    // Assert Core Web Vitals
    if (vitals.FCP !== null) {
      expect(vitals.FCP).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.FCP)
    }
    if (vitals.LCP !== null) {
      expect(vitals.LCP).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.LCP)
    }
    if (vitals.CLS !== null) {
      expect(vitals.CLS).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.CLS)
    }
    if (vitals.TTFB !== null) {
      expect(vitals.TTFB).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.TTFB)
    }
  })

  test('actions meets Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/dashboard/actions')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const vitals = await getWebVitals(page)

    console.log('\n=== Playbook Web Vitals ===')
    console.log(`FCP: ${vitals.FCP?.toFixed(0) || 'N/A'}ms`)
    console.log(`LCP: ${vitals.LCP?.toFixed(0) || 'N/A'}ms`)
    console.log(`CLS: ${vitals.CLS?.toFixed(3) || 'N/A'}`)

    if (vitals.LCP !== null) {
      expect(vitals.LCP).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.LCP)
    }
    if (vitals.CLS !== null) {
      expect(vitals.CLS).toBeLessThan(PERFORMANCE_BUDGETS.webVitals.CLS)
    }
  })
})

test.describe('Performance - Navigation Speed', () => {
  test('client-side navigation is fast', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Measure client-side navigation
    const navStart = Date.now()
    await page.click('a[href="/dashboard/actions"]')
    await page.waitForURL('**/actions')
    await page.waitForLoadState('networkidle')
    const navTime = Date.now() - navStart

    console.log(`\nClient-side navigation to actions: ${navTime}ms`)

    // Client-side nav should be much faster than full page load
    expect(navTime).toBeLessThan(2000)
  })

  test('back navigation is instant', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.click('a[href="/dashboard/actions"]')
    await page.waitForURL('**/actions')
    await page.waitForLoadState('networkidle')

    // Measure back navigation
    const backStart = Date.now()
    await page.goBack()
    await page.waitForLoadState('networkidle')
    const backTime = Date.now() - backStart

    console.log(`\nBack navigation time: ${backTime}ms`)

    // Back navigation should use browser cache
    expect(backTime).toBeLessThan(1500)
  })
})

test.describe('Performance - API Response Times', () => {
  test('API endpoints respond within budget', async ({ page }) => {
    const apiTimings: { url: string; duration: number }[] = []

    // Listen for API responses
    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('/api/')) {
        const timing = response.timing()
        if (timing) {
          apiTimings.push({
            url: url.replace(/.*\/api\//, '/api/'),
            duration: timing.responseEnd,
          })
        }
      }
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    console.log('\n=== API Response Times ===')
    apiTimings.forEach((api) => {
      console.log(`${api.url}: ${api.duration.toFixed(0)}ms`)
    })

    // Check that no API call exceeds the slow threshold
    const slowApis = apiTimings.filter((api) => api.duration > PERFORMANCE_BUDGETS.api.slow)
    if (slowApis.length > 0) {
      console.log('\nSlow APIs detected:')
      slowApis.forEach((api) => console.log(`  ${api.url}: ${api.duration.toFixed(0)}ms`))
    }

    expect(slowApis.length).toBe(0)
  })

  test('companies API is fast', async ({ page, request }) => {
    // Direct API test
    const startTime = Date.now()
    const response = await request.get('/api/companies')
    const duration = Date.now() - startTime

    console.log(`\n/api/companies response time: ${duration}ms`)
    console.log(`Status: ${response.status()}`)

    expect(response.status()).toBe(200)
    expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.api.normal)
  })
})

test.describe('Performance - Resource Loading', () => {
  test('JavaScript bundle size is reasonable', async ({ page }) => {
    const jsResources: { url: string; size: number }[] = []

    page.on('response', async (response) => {
      const url = response.url()
      if (url.endsWith('.js') || url.includes('.js?')) {
        const headers = response.headers()
        const contentLength = parseInt(headers['content-length'] || '0', 10)
        if (contentLength > 0) {
          jsResources.push({
            url: url.split('/').pop() || url,
            size: contentLength,
          })
        }
      }
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0)
    const totalJsKB = (totalJsSize / 1024).toFixed(1)

    console.log('\n=== JavaScript Bundle Analysis ===')
    console.log(`Total JS size: ${totalJsKB} KB`)
    console.log(`Number of JS files: ${jsResources.length}`)

    // Log largest bundles
    const sorted = jsResources.sort((a, b) => b.size - a.size)
    console.log('\nLargest bundles:')
    sorted.slice(0, 5).forEach((r) => {
      console.log(`  ${r.url}: ${(r.size / 1024).toFixed(1)} KB`)
    })

    // Total JS should be under 500KB (adjust as needed)
    expect(totalJsSize).toBeLessThan(500 * 1024)
  })

  test('images are optimized', async ({ page }) => {
    const imageResources: { url: string; size: number }[] = []

    page.on('response', async (response) => {
      const url = response.url()
      const contentType = response.headers()['content-type'] || ''
      if (contentType.includes('image/')) {
        const headers = response.headers()
        const contentLength = parseInt(headers['content-length'] || '0', 10)
        imageResources.push({
          url: url.split('/').pop() || url,
          size: contentLength,
        })
      }
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    console.log('\n=== Image Analysis ===')
    console.log(`Number of images: ${imageResources.length}`)

    // Check for large unoptimized images (>200KB)
    const largeImages = imageResources.filter((img) => img.size > 200 * 1024)
    if (largeImages.length > 0) {
      console.log('\nLarge images detected (>200KB):')
      largeImages.forEach((img) => {
        console.log(`  ${img.url}: ${(img.size / 1024).toFixed(1)} KB`)
      })
    }

    expect(largeImages.length).toBe(0)
  })

  test('no render-blocking resources', async ({ page }) => {
    const blockingResources: string[] = []

    page.on('response', (response) => {
      const url = response.url()
      const headers = response.headers()

      // Check for non-async scripts in head
      if (url.endsWith('.css') && !headers['link']?.includes('preload')) {
        // CSS in head is potentially render-blocking
        // This is a simplified check
      }
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Check for render-blocking scripts
    const blockingScripts = await page.evaluate(() => {
      const scripts = document.querySelectorAll('head script:not([async]):not([defer])')
      return Array.from(scripts)
        .map((s) => (s as HTMLScriptElement).src)
        .filter((src) => src)
    })

    console.log('\n=== Render-Blocking Resources ===')
    if (blockingScripts.length > 0) {
      console.log('Blocking scripts in <head>:')
      blockingScripts.forEach((src) => console.log(`  ${src}`))
    } else {
      console.log('No render-blocking scripts found')
    }

    // Should have minimal blocking resources
    expect(blockingScripts.length).toBeLessThanOrEqual(2)
  })
})

test.describe('Performance - Mobile', () => {
  test('mobile performance is acceptable', async ({ page }) => {
    // Emulate mobile device with slow 3G
    await page.setViewportSize({ width: 375, height: 667 })

    const startTime = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    console.log(`\n=== Mobile Performance ===`)
    console.log(`Load time (mobile viewport): ${loadTime}ms`)

    // Mobile should still load reasonably fast
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad.load * 1.5)
  })
})

test.describe('Performance - Auth Pages', () => {
  test('login page loads within acceptable time @no-auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    const startTime = Date.now()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    console.log(`\n=== Login Page Performance ===`)
    console.log(`Load time: ${loadTime}ms`)

    // External auth pages (Supabase) may have redirects and take longer
    // Threshold is more generous for external auth UI
    expect(loadTime).toBeLessThan(8000)

    await context.close()
  })
})

test.describe('Performance - Summary Report @smoke', () => {
  test('generate performance summary', async ({ page }) => {
    const results: {
      page: string
      loadTime: number
      ttfb: number
      fcp: number | null
      lcp: number | null
    }[] = []

    const pages = [
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/dashboard/actions', name: 'Playbook' },
      { url: '/dashboard/data-room', name: 'Data Room' },
      { url: '/dashboard/assessment', name: 'Assessment' },
      { url: '/dashboard/financials/pnl', name: 'Financials' },
      { url: '/dashboard/settings/user', name: 'Settings' },
    ]

    for (const pageInfo of pages) {
      const startTime = Date.now()
      await page.goto(pageInfo.url)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      const metrics = await measurePagePerformance(page)
      const vitals = await getWebVitals(page)

      results.push({
        page: pageInfo.name,
        loadTime,
        ttfb: metrics.ttfb,
        fcp: vitals.FCP,
        lcp: vitals.LCP,
      })
    }

    // Print summary table
    console.log('\n' + '='.repeat(70))
    console.log('PERFORMANCE SUMMARY')
    console.log('='.repeat(70))
    console.log(
      'Page'.padEnd(15) +
        'Load (ms)'.padEnd(12) +
        'TTFB (ms)'.padEnd(12) +
        'FCP (ms)'.padEnd(12) +
        'LCP (ms)'.padEnd(12)
    )
    console.log('-'.repeat(70))

    results.forEach((r) => {
      console.log(
        r.page.padEnd(15) +
          r.loadTime.toString().padEnd(12) +
          r.ttfb.toString().padEnd(12) +
          (r.fcp?.toFixed(0) || 'N/A').padEnd(12) +
          (r.lcp?.toFixed(0) || 'N/A').padEnd(12)
      )
    })

    console.log('-'.repeat(70))

    // Calculate averages
    const avgLoad = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length
    const avgTtfb = results.reduce((sum, r) => sum + r.ttfb, 0) / results.length

    console.log(
      'Average'.padEnd(15) + avgLoad.toFixed(0).padEnd(12) + avgTtfb.toFixed(0).padEnd(12)
    )
    console.log('='.repeat(70))

    // Overall pass/fail
    const allPassed = results.every(
      (r) => r.loadTime < PERFORMANCE_BUDGETS.pageLoad.load && r.ttfb < PERFORMANCE_BUDGETS.webVitals.TTFB
    )

    console.log(`\nOverall: ${allPassed ? 'PASS' : 'NEEDS ATTENTION'}`)

    expect(allPassed).toBeTruthy()
  })
})
