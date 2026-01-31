import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://8399378228d6a93cbe7a9a7e41766497@o4510802430132224.ingest.us.sentry.io/4510802444812288",

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
})
