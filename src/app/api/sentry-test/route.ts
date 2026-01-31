import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  try {
    // Throw a test error
    throw new Error('Sentry test error - verifying error tracking is working')
  } catch (error) {
    // Capture and report to Sentry
    Sentry.captureException(error)

    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry. Check your Sentry dashboard.',
      timestamp: new Date().toISOString(),
    })
  }
}
