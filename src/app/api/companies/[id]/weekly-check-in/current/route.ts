import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const weekOf = getWeekStart()
  const expiresAt = new Date(weekOf)
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Find or create this week's check-in
  let checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { companyId_weekOf: { companyId, weekOf } },
  })

  if (!checkIn) {
    checkIn = await prisma.weeklyCheckIn.create({
      data: {
        companyId,
        weekOf,
        expiresAt,
      },
    })
  }

  return NextResponse.json({
    checkIn: {
      id: checkIn.id,
      weekOf: checkIn.weekOf.toISOString(),
      expiresAt: checkIn.expiresAt.toISOString(),
      completedAt: checkIn.completedAt?.toISOString() ?? null,
      skippedAt: checkIn.skippedAt?.toISOString() ?? null,
      taskStatus: checkIn.taskStatus,
      teamChanges: checkIn.teamChanges,
      teamChangesNote: checkIn.teamChangesNote,
      customerChanges: checkIn.customerChanges,
      customerChangesNote: checkIn.customerChangesNote,
      confidenceRating: checkIn.confidenceRating,
      additionalNotes: checkIn.additionalNotes,
    },
  })
}
