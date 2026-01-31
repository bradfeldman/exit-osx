import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET() {
  // Simple test first - no Sentry
  return NextResponse.json({
    success: true,
    message: 'Endpoint working',
    timestamp: new Date().toISOString(),
  })
}
