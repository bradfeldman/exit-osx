import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1,

    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',

    // Environment
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  })
}
