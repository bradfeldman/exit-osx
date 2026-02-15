import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// Patterns that indicate sensitive data in error messages
const SENSITIVE_PATTERNS = [
  /\b\d{4,}\.\d{2}\b/g,                    // Financial figures (e.g., 1234.56)
  /\$[\d,]+\.?\d*/g,                        // Dollar amounts
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\bSELECT\b.*\bFROM\b/gi,                // SQL queries
  /\bINSERT\b.*\bINTO\b/gi,                // SQL inserts
  /\bUPDATE\b.*\bSET\b/gi,                 // SQL updates
  /password['":\s]*[^\s,}]+/gi,            // Password values
  /token['":\s]*[^\s,}]+/gi,              // Token values
  /\bapi[_-]?key['":\s]*[^\s,}]+/gi,      // API keys
]

function scrubSensitiveData(str: string): string {
  let scrubbed = str
  for (const pattern of SENSITIVE_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]')
  }
  return scrubbed
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1,

    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',

    // Environment
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

    // Capture unhandled promise rejections
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['error'],
      }),
    ],

    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV !== 'production') {
        return null
      }

      // Scrub sensitive data from exception messages
      if (event.exception?.values) {
        for (const value of event.exception.values) {
          if (value.value) {
            value.value = scrubSensitiveData(value.value)
          }
        }
      }

      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.message) {
            breadcrumb.message = scrubSensitiveData(breadcrumb.message)
          }
        }
      }

      return event
    },
  })
}
