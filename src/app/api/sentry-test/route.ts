import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET() {
  const testError = new Error('Sentry test error - verifying error tracking is working')

  Sentry.captureException(testError)

  return NextResponse.json({
    success: true,
    message: 'Test error sent to Sentry. Check your Sentry dashboard.',
    timestamp: new Date().toISOString(),
  })
}
