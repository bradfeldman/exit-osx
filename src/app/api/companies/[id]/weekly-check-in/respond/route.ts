import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { processCheckInSignals } from '@/lib/weekly-check-in/process-signals'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const checkInResponseSchema = z.object({
  checkInId: z.string().cuid(),
  taskStatus: z.enum(['on_track', 'behind', 'blocked', 'ahead']).optional().nullable(),
  teamChanges: z.boolean().optional().nullable(),
  teamChangesNote: z.string().max(5000).optional().nullable(),
  customerChanges: z.boolean().optional().nullable(),
  customerChangesNote: z.string().max(5000).optional().nullable(),
  confidenceRating: z.number().int().min(1).max(10).optional().nullable(),
  additionalNotes: z.string().max(10000).optional().nullable(),
  skipped: z.boolean().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const validation = await validateRequestBody(request, checkInResponseSchema)
  if (!validation.success) return validation.error
  const {
    checkInId,
    taskStatus,
    teamChanges,
    teamChangesNote,
    customerChanges,
    customerChangesNote,
    confidenceRating,
    additionalNotes,
    skipped,
  } = validation.data

  // Verify check-in belongs to this company and isn't already completed
  const checkIn = await prisma.weeklyCheckIn.findFirst({
    where: { id: checkInId, companyId },
  })

  if (!checkIn) {
    return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
  }

  if (checkIn.completedAt || checkIn.skippedAt) {
    return NextResponse.json({ error: 'Check-in already submitted' }, { status: 400 })
  }

  if (skipped) {
    const updated = await prisma.weeklyCheckIn.update({
      where: { id: checkInId },
      data: { skippedAt: new Date() },
    })
    return NextResponse.json({ checkIn: updated })
  }

  // Save answers
  const updated = await prisma.weeklyCheckIn.update({
    where: { id: checkInId },
    data: {
      taskStatus: taskStatus ?? null,
      teamChanges: teamChanges ?? null,
      teamChangesNote: teamChangesNote ?? null,
      customerChanges: customerChanges ?? null,
      customerChangesNote: customerChangesNote ?? null,
      confidenceRating: confidenceRating ?? null,
      additionalNotes: additionalNotes ?? null,
      completedAt: new Date(),
    },
  })

  // Generate signals from answers
  const signals = await processCheckInSignals({
    companyId,
    taskStatus: taskStatus ?? null,
    teamChanges: teamChanges ?? null,
    teamChangesNote: teamChangesNote ?? null,
    customerChanges: customerChanges ?? null,
    customerChangesNote: customerChangesNote ?? null,
    confidenceRating: confidenceRating ?? null,
    additionalNotes: additionalNotes ?? null,
  })

  return NextResponse.json({
    checkIn: updated,
    signalsCreated: signals.length,
  })
}
