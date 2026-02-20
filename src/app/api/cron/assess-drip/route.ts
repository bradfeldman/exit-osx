import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendDay2Email,
  sendDay5Email,
  type AssessmentLeadData,
} from '@/lib/email/assess-drip'

/**
 * GET /api/cron/assess-drip
 *
 * Daily cron job that sends Day 2 and Day 5 drip emails to assessment leads.
 * Should be called once per day by Vercel Cron.
 *
 * Protected by CRON_SECRET header to prevent unauthorized triggering.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { day2: { sent: 0, failed: 0 }, day5: { sent: 0, failed: 0 } }

  try {
    // Day 2 emails: leads created 2-3 days ago, day2 not sent, not converted
    const day2Start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const day2End = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    const day2Leads = await prisma.assessmentLead.findMany({
      where: {
        createdAt: { gte: day2Start, lt: day2End },
        day2SentAt: null,
        convertedAt: null,
      },
      select: {
        id: true,
        email: true,
        briScore: true,
        currentValue: true,
        potentialValue: true,
        topRisk: true,
      },
      take: 100, // Process in batches
    })

    for (const lead of day2Leads) {
      const data: AssessmentLeadData = {
        id: lead.id,
        email: lead.email,
        briScore: lead.briScore,
        currentValue: lead.currentValue,
        potentialValue: lead.potentialValue,
        topRisk: lead.topRisk,
      }

      const sent = await sendDay2Email(data)
      if (sent) {
        await prisma.assessmentLead.update({
          where: { id: lead.id },
          data: { day2SentAt: new Date() },
        })
        results.day2.sent++
      } else {
        results.day2.failed++
      }
    }

    // Day 5 emails: leads created 5-6 days ago, day5 not sent, not converted
    const day5Start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    const day5End = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

    const day5Leads = await prisma.assessmentLead.findMany({
      where: {
        createdAt: { gte: day5Start, lt: day5End },
        day5SentAt: null,
        convertedAt: null,
      },
      select: {
        id: true,
        email: true,
        briScore: true,
        currentValue: true,
        potentialValue: true,
        topRisk: true,
      },
      take: 100,
    })

    for (const lead of day5Leads) {
      const data: AssessmentLeadData = {
        id: lead.id,
        email: lead.email,
        briScore: lead.briScore,
        currentValue: lead.currentValue,
        potentialValue: lead.potentialValue,
        topRisk: lead.topRisk,
      }

      const sent = await sendDay5Email(data)
      if (sent) {
        await prisma.assessmentLead.update({
          where: { id: lead.id },
          data: { day5SentAt: new Date() },
        })
        results.day5.sent++
      } else {
        results.day5.failed++
      }
    }

    console.log('[Cron] assess-drip results:', results)
    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error(
      '[Cron] assess-drip error:',
      err instanceof Error ? err.message : String(err)
    )
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
