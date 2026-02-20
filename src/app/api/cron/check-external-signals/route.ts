import { NextResponse } from 'next/server'

// Placeholder for v2 automated external signal checking
// When implemented, this will:
// 1. Query active ExternalSignalSource records
// 2. Check each source's API for new filings/events
// 3. Create EXTERNAL signals for any new findings
// NOT added to vercel.json cron schedule yet

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.json({
    message: 'External signal checking not yet automated. Use POST /api/admin/external-signals for manual ingestion.',
    checked: 0,
    signalsCreated: 0,
  })
}
