import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  const testError = new Error('Sentry test error - verifying error tracking is working')

  // Capture the error
  Sentry.captureException(testError)

  // Flush to ensure error is sent before response
  await Sentry.flush(2000)

  return NextResponse.json({
    success: true,
    message: 'Test error sent to Sentry. Check your Sentry dashboard.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}
