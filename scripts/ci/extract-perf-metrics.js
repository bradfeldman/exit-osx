#!/usr/bin/env node
/**
 * Extracts performance metrics from Playwright test results
 * Generates a JSON summary for trend tracking
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs')
const path = require('path')

const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results')
const OUTPUT_FILE = path.join(process.cwd(), 'performance-metrics.json')

console.log('📊 Extracting performance metrics...\n')

if (!fs.existsSync(TEST_RESULTS_DIR)) {
  console.error('❌ Test results directory not found')
  process.exit(1)
}

// Find all test result JSON files
function findResultFiles(dir) {
  const files = []
  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      files.push(...findResultFiles(fullPath))
    } else if (item.name.endsWith('.json') && item.name.includes('result')) {
      files.push(fullPath)
    }
  }

  return files
}

const resultFiles = findResultFiles(TEST_RESULTS_DIR)

if (resultFiles.length === 0) {
  console.warn('⚠️  No test result files found')
  // Create empty metrics file
  const emptyMetrics = {
    timestamp: new Date().toISOString(),
    metrics: {},
    summary: {
      testsRun: 0,
      note: 'No performance test results found'
    }
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emptyMetrics, null, 2))
  process.exit(0)
}

console.log(`Found ${resultFiles.length} result file(s)`)

// Extract metrics from all result files
const allMetrics = []

for (const file of resultFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8')
    const data = JSON.parse(content)

    // Extract performance-related data
    if (data.performance || data.metrics || data.timing) {
      allMetrics.push({
        file: path.relative(TEST_RESULTS_DIR, file),
        ...data
      })
    }
  } catch (error) {
    console.warn(`⚠️  Could not parse ${file}:`, error.message)
  }
}

// Generate summary
const summary = {
  timestamp: new Date().toISOString(),
  totalTests: allMetrics.length,
  metrics: {
    // Placeholder structure - actual metrics depend on test output format
    pageLoads: [],
    apiRequests: [],
    renderTimes: []
  }
}

// Try to extract common performance metrics
for (const metric of allMetrics) {
  // Look for common performance indicators
  if (metric.loadTime) {
    summary.metrics.pageLoads.push({
      page: metric.page || 'unknown',
      loadTime: metric.loadTime,
      timestamp: metric.timestamp
    })
  }

  if (metric.ttfb) {
    summary.metrics.apiRequests.push({
      endpoint: metric.endpoint || 'unknown',
      ttfb: metric.ttfb,
      duration: metric.duration
    })
  }
}

// Calculate aggregates
const calculateStats = (values) => {
  if (!values || values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    p95: sorted[Math.floor(sorted.length * 0.95)]
  }
}

// Add statistics
summary.statistics = {
  pageLoadTimes: calculateStats(summary.metrics.pageLoads.map(p => p.loadTime)),
  apiResponseTimes: calculateStats(summary.metrics.apiRequests.map(a => a.duration))
}

// Write output
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2))

console.log('\n✅ Performance metrics extracted')
console.log(`📄 Saved to: ${OUTPUT_FILE}`)

// Print summary
if (summary.statistics.pageLoadTimes) {
  console.log('\n📈 Page Load Times:')
  console.log(`   Median: ${Math.round(summary.statistics.pageLoadTimes.median)}ms`)
  console.log(`   P95: ${Math.round(summary.statistics.pageLoadTimes.p95)}ms`)
}

if (summary.statistics.apiResponseTimes) {
  console.log('\n📈 API Response Times:')
  console.log(`   Median: ${Math.round(summary.statistics.apiResponseTimes.median)}ms`)
  console.log(`   P95: ${Math.round(summary.statistics.apiResponseTimes.p95)}ms`)
}

process.exit(0)
