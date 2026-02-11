#!/usr/bin/env node
/**
 * Validates CSP (Content Security Policy) configuration in next.config.ts
 * Ensures all required security headers are present and properly configured
 */

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(process.cwd(), 'next.config.ts')

console.log('🔒 Validating Content Security Policy configuration...\n')

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('❌ next.config.ts not found!')
  process.exit(1)
}

const configContent = fs.readFileSync(CONFIG_PATH, 'utf8')

// Required CSP directives
const requiredDirectives = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-ancestors',
]

// Required security headers
const requiredHeaders = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Strict-Transport-Security',
]

let hasErrors = false

// Check for required directives in CSP
console.log('Checking CSP directives...')
for (const directive of requiredDirectives) {
  if (!configContent.includes(directive)) {
    console.error(`❌ Missing CSP directive: ${directive}`)
    hasErrors = true
  } else {
    console.log(`✓ ${directive}`)
  }
}

console.log('\nChecking security headers...')
for (const header of requiredHeaders) {
  if (!configContent.includes(header)) {
    console.error(`❌ Missing security header: ${header}`)
    hasErrors = true
  } else {
    console.log(`✓ ${header}`)
  }
}

// Check for HSTS with proper max-age
console.log('\nChecking HSTS configuration...')
const hstsMatch = configContent.match(/Strict-Transport-Security.*max-age=(\d+)/)
if (hstsMatch) {
  const maxAge = parseInt(hstsMatch[1], 10)
  const oneYear = 31536000
  if (maxAge >= oneYear) {
    console.log(`✓ HSTS max-age: ${maxAge}s (${Math.floor(maxAge / oneYear)} year${maxAge >= oneYear * 2 ? 's' : ''})`)
  } else {
    console.error(`❌ HSTS max-age too short: ${maxAge}s (should be at least ${oneYear}s)`)
    hasErrors = true
  }
} else {
  console.error('❌ HSTS max-age not found')
  hasErrors = true
}

// Check for unsafe-inline in production CSP
console.log('\nChecking for unsafe CSP practices...')
if (configContent.includes("'unsafe-inline'") && !configContent.includes('development')) {
  console.warn('⚠️  Warning: unsafe-inline detected (ensure it\'s only for development)')
}

if (configContent.includes("'unsafe-eval'")) {
  console.warn('⚠️  Warning: unsafe-eval detected (should be avoided)')
}

// Check for frame-ancestors
if (configContent.includes("frame-ancestors 'none'") || configContent.includes("frame-ancestors 'self'")) {
  console.log('✓ frame-ancestors configured (clickjacking protection)')
} else {
  console.error('❌ frame-ancestors not properly configured')
  hasErrors = true
}

console.log('\n' + '='.repeat(50))

if (hasErrors) {
  console.error('❌ CSP validation failed! Please fix the errors above.')
  process.exit(1)
} else {
  console.log('✅ CSP configuration is valid!')
  process.exit(0)
}
