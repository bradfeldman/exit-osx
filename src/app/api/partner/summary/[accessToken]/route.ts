import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security'

// GET — Sanitized progress data for accountability partner
// SECURITY FIX (PROD-060): Added rate limiting to token-based endpoint
export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessToken: string }> }
) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }
  const { accessToken } = await params

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { accessToken },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: { name: true },
      },
    },
  })

  if (!partner || !partner.isActive || !partner.acceptedAt) {
    return NextResponse.json({ error: 'Invalid or inactive access' }, { status: 404 })
  }

  const companyId = partner.company.id

  // Get latest snapshot for BRI direction (no valuation data)
  const snapshots = await prisma.valuationSnapshot.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: {
      briScore: true,
      createdAt: true,
    },
  })

  const latestBri = snapshots[0] ? Math.round(Number(snapshots[0].briScore) * 100) : null
  const previousBri = snapshots[1] ? Math.round(Number(snapshots[1].briScore) * 100) : null
  const briDirection = latestBri !== null && previousBri !== null
    ? (latestBri > previousBri ? 'improving' : latestBri < previousBri ? 'declining' : 'stable')
    : null

  // Task counts (no details, just counts)
  const taskCounts = await prisma.task.groupBy({
    by: ['status'],
    where: { companyId },
    _count: true,
  })

  const taskSummary = {
    completed: taskCounts.find(t => t.status === 'COMPLETED')?._count ?? 0,
    inProgress: taskCounts.find(t => t.status === 'IN_PROGRESS')?._count ?? 0,
    pending: taskCounts.find(t => t.status === 'PENDING')?._count ?? 0,
  }

  // Last activity (most recent task completion)
  const lastCompletedTask = await prisma.task.findFirst({
    where: { companyId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  })

  return NextResponse.json({
    companyName: partner.company.name,
    ownerName: partner.invitedBy.name || 'The owner',
    partnerName: partner.name,
    briDirection,
    briChangePoints: latestBri !== null && previousBri !== null ? Math.abs(latestBri - previousBri) : 0,
    taskSummary,
    lastActivityAt: lastCompletedTask?.completedAt?.toISOString() ?? null,
    canNudge: !partner.lastNudgeAt || (Date.now() - partner.lastNudgeAt.getTime() > 24 * 60 * 60 * 1000),
  })
}
