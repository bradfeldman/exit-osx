import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getAdvisorClients, isExternalAdvisor } from '@/lib/auth/check-granular-permission'
import { dismissSignal } from '@/lib/signals/confirm-signal'
import { validateRequestBody, shortText } from '@/lib/security/validation'

const dismissSignalSchema = z.object({
  reason: shortText.min(1),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string; signalId: string }> }
) {
  const { companyId, signalId } = await params

  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdvisor = await isExternalAdvisor(user.id)
  if (!isAdvisor) {
    return NextResponse.json({ error: 'Not an advisor' }, { status: 403 })
  }

  const clients = await getAdvisorClients(user.id)
  if (!clients.some(c => c.companyId === companyId)) {
    return NextResponse.json({ error: 'No access to this company' }, { status: 403 })
  }

  // Verify signal belongs to this company
  const signal = await prisma.signal.findFirst({
    where: { id: signalId, companyId },
  })
  if (!signal) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
  }

  const validation = await validateRequestBody(request, dismissSignalSchema)
  if (!validation.success) return validation.error

  const { reason } = validation.data

  const updated = await dismissSignal(signalId, user.id, reason)

  return NextResponse.json({ signal: updated })
}
