import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getAdvisorClients, isExternalAdvisor } from '@/lib/auth/check-granular-permission'
import { createSignalWithLedgerEntry } from '@/lib/signals/create-signal'
import { getDefaultConfidenceForChannel } from '@/lib/signals/confidence-scoring'
import { validateRequestBody, shortText, longText } from '@/lib/security/validation'

async function verifyAdvisorAccess(companyId: string) {
  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser) return null

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  })
  if (!user) return null

  const isAdvisor = await isExternalAdvisor(user.id)
  if (!isAdvisor) return null

  const clients = await getAdvisorClients(user.id)
  const hasAccess = clients.some(c => c.companyId === companyId)
  if (!hasAccess) return null

  return user
}

// GET — List signals for an advisor's client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const user = await verifyAdvisorAccess(companyId)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const signals = await prisma.signal.findMany({
    where: {
      companyId,
      resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'DISMISSED'] },
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      channel: true,
      category: true,
      eventType: true,
      severity: true,
      confidence: true,
      title: true,
      description: true,
      userConfirmed: true,
      confirmedAt: true,
      confirmedByUserId: true,
      resolutionStatus: true,
      resolutionNotes: true,
      estimatedValueImpact: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    signals: signals.map(s => ({
      ...s,
      estimatedValueImpact: s.estimatedValueImpact ? Number(s.estimatedValueImpact) : null,
    })),
  })
}

const advisorSignalSchema = z.object({
  title: shortText.min(1),
  description: longText.optional().nullable(),
  category: z.enum(['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']).optional().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
})

// POST — Create an advisor observation signal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const user = await verifyAdvisorAccess(companyId)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const validation = await validateRequestBody(request, advisorSignalSchema)
  if (!validation.success) return validation.error

  const { title, description, category, severity } = validation.data

  const advisorConfidence = getDefaultConfidenceForChannel('ADVISOR')

  const { signal } = await createSignalWithLedgerEntry({
    companyId,
    channel: 'ADVISOR',
    category: category || null,
    eventType: 'advisor_observation',
    severity: severity || 'MEDIUM',
    confidence: advisorConfidence,
    title,
    description: description || null,
    sourceType: 'advisor',
    sourceId: user.id,
    ledgerEventType: 'NEW_DATA_CONNECTED',
    narrativeSummary: `Advisor observation: "${title}"${description ? ` — ${description}` : ''}`,
  })

  return NextResponse.json({ signal }, { status: 201 })
}
