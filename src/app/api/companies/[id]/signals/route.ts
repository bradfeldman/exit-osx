import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { createSignal } from '@/lib/signals/create-signal'
import { processSignalsForDisplay, type RankableSignal } from '@/lib/signals/signal-ranking'
import { applyConfidenceWeight } from '@/lib/signals/confidence-scoring'
import type { SignalChannel, SignalResolutionStatus, SignalSeverity, BriCategory } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') as SignalResolutionStatus | null
  const channel = searchParams.get('channel') as SignalChannel | null
  const severity = searchParams.get('severity') as SignalSeverity | null
  const ranked = searchParams.get('ranked') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const cursor = searchParams.get('cursor')

  const where: Record<string, unknown> = { companyId }
  if (status) where.resolutionStatus = status
  if (channel) where.channel = channel
  if (severity) where.severity = severity

  try {
    const signals = await prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: ranked ? undefined : limit + 1,
      ...(cursor && !ranked ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        channel: true,
        category: true,
        eventType: true,
        severity: true,
        confidence: true,
        title: true,
        description: true,
        resolutionStatus: true,
        estimatedValueImpact: true,
        userConfirmed: true,
        createdAt: true,
        expiresAt: true,
      },
    })

    // PROD-021: When ranked=true, apply signal ranking, grouping, and fatigue prevention
    if (ranked) {
      const rankableSignals: RankableSignal[] = signals.map(s => ({
        id: s.id,
        severity: s.severity,
        confidence: s.confidence,
        estimatedValueImpact: s.estimatedValueImpact ? Number(s.estimatedValueImpact) : null,
        resolutionStatus: s.resolutionStatus,
        eventType: s.eventType,
        channel: s.channel,
        category: s.category,
        title: s.title,
        description: s.description,
        createdAt: s.createdAt,
      }))

      const rankingResult = processSignalsForDisplay(rankableSignals)

      return NextResponse.json({
        activeDisplayGroups: rankingResult.activeDisplayGroups,
        queuedGroups: rankingResult.queuedGroups,
        totalWeightedValueAtRisk: rankingResult.totalWeightedValueAtRisk,
        totalSignalCount: rankingResult.totalSignalCount,
      })
    }

    // Default: paginated list with confidence-weighted impact
    const hasMore = signals.length > limit
    const trimmed = hasMore ? signals.slice(0, limit) : signals
    const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null

    return NextResponse.json({
      signals: trimmed.map((s) => {
        const rawImpact = s.estimatedValueImpact ? Number(s.estimatedValueImpact) : null
        return {
          ...s,
          estimatedValueImpact: rawImpact,
          // PROD-021: Include confidence-weighted impact alongside raw impact
          weightedValueImpact: rawImpact != null
            ? applyConfidenceWeight(rawImpact, s.confidence)
            : null,
        }
      }),
      nextCursor,
    })
  } catch (error) {
    console.error('[Signals] Error fetching signals:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('TASK_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { channel, title, description, category, estimatedValueImpact, metadata } = body as {
      channel: SignalChannel
      title: string
      description?: string
      category?: BriCategory
      estimatedValueImpact?: number
      metadata?: Record<string, unknown>
    }

    if (!channel || !title) {
      return NextResponse.json(
        { error: 'channel and title are required' },
        { status: 400 }
      )
    }

    const signal = await createSignal({
      companyId,
      channel,
      title,
      description,
      category,
      estimatedValueImpact,
      rawData: metadata,
      eventType: `manual_${channel.toLowerCase()}`,
    })

    return NextResponse.json({ signal }, { status: 201 })
  } catch (error) {
    console.error('[Signals] Error creating signal:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create signal' },
      { status: 500 }
    )
  }
}
