#!/usr/bin/env node
/**
 * Analyzes Next.js build output and checks bundle sizes
 * Warns if bundles exceed recommended thresholds
 */

const fs = require('fs')
const path = require('path')

const BUILD_DIR = path.join(process.cwd(), '.next')
const BUILD_MANIFEST = path.join(BUILD_DIR, 'build-manifest.json')

// Size thresholds (in KB)
const THRESHOLDS = {
  page: 500, // Individual page bundles
  shared: 200, // Shared chunks
  total: 1000, // Total JS for initial page load
}

console.log('📦 Analyzing bundle sizes...\n')

if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Build directory not found. Run npm run build first.')
  process.exit(1)
}

// Read Next.js build output
let buildInfo
try {
  // Try to read the build manifest
  if (fs.existsSync(BUILD_MANIFEST)) {
    buildInfo = JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf8'))
  } else {
    console.warn('⚠️  Build manifest not found, analyzing directory structure...')
  }
} catch (error) {
  console.error('❌ Failed to parse build manifest:', error.message)
  process.exit(1)
}

// Analyze static directory
const staticDir = path.join(BUILD_DIR, 'static')
if (!fs.existsSync(staticDir)) {
  console.warn('⚠️  Static directory not found')
  process.exit(0)
}

// Get all JS files
function getFilesRecursively(dir) {
  const files = []
  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      files.push(...getFilesRecursively(fullPath))
    } else if (item.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

const jsFiles = getFilesRecursively(staticDir)
const fileSizes = jsFiles.map(file => {
  const stats = fs.statSync(file)
  const sizeKB = Math.round(stats.size / 1024)
  const relativePath = path.relative(BUILD_DIR, file)
  return { path: relativePath, size: sizeKB }
})

// Sort by size descending
fileSizes.sort((a, b) => b.size - a.size)

// Calculate totals
const totalSize = fileSizes.reduce((sum, file) => sum + file.size, 0)
const largestFiles = fileSizes.slice(0, 10)

console.log('Top 10 largest JavaScript bundles:')
console.log('─'.repeat(70))
for (const file of largestFiles) {
  const sizeStr = `${file.size} KB`
  const warning = file.size > THRESHOLDS.page ? ' ⚠️  LARGE' : ''
  console.log(`${sizeStr.padEnd(10)} ${file.path}${warning}`)
}

console.log('─'.repeat(70))
console.log(`Total JS size: ${totalSize} KB`)

// Check thresholds
let hasWarnings = false

// Check for oversized individual bundles
const oversizedBundles = fileSizes.filter(f => f.size > THRESHOLDS.page)
if (oversizedBundles.length > 0) {
  console.warn(`\n⚠️  ${oversizedBundles.length} bundle(s) exceed ${THRESHOLDS.page}KB threshold`)
  hasWarnings = true
}

// Check total size
if (totalSize > THRESHOLDS.total * 5) {
  console.warn(`\n⚠️  Total bundle size (${totalSize}KB) is very large`)
  hasWarnings = true
}

// Provide recommendations
if (hasWarnings) {
  console.log('\n💡 Recommendations:')
  console.log('   - Review large bundles and consider code splitting')
  console.log('   - Check for duplicate dependencies')
  console.log('   - Use dynamic imports for heavy components')
  console.log('   - Run: ANALYZE=true npm run build to see detailed analysis')
}

// Check for common bundle issues
console.log('\n🔍 Checking for common issues...')

// Check for multiple React bundles (common issue)
const reactBundles = fileSizes.filter(f => f.path.includes('react'))
if (reactBundles.length > 5) {
  console.warn(`⚠️  Found ${reactBundles.length} React-related bundles (possible duplication)`)
  hasWarnings = true
}

// Check for source maps in production
const sourceMaps = fileSizes.filter(f => f.path.endsWith('.map'))
if (sourceMaps.length > 0) {
  console.log(`ℹ️  ${sourceMaps.length} source map(s) generated`)
}

console.log('\n' + '='.repeat(70))

if (hasWarnings) {
  console.log('⚠️  Bundle size check completed with warnings')
  // Don't fail the build, just warn
  process.exit(0)
} else {
  console.log('✅ Bundle sizes look good!')
  process.exit(0)
}
