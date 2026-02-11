/**
 * GET /api/companies/[id]/value-at-risk
 *
 * PROD-022: Value-at-Risk Monitoring & Aggregation
 *
 * Aggregates all active (OPEN) signals with estimatedValueImpact for a company,
 * applies confidence weighting, and returns:
 *   - totalValueAtRisk: confidence-weighted sum
 *   - rawValueAtRisk: unweighted sum
 *   - signalCount: number of contributing signals
 *   - topThreats: top 3 highest-impact signals
 *   - byCategory: breakdown per BRI category
 *   - trend: whether VaR is increasing, decreasing, or stable vs. 30 days ago
 *
 * Auth: Requires COMPANY_VIEW permission on the company.
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import {
  calculateValueAtRisk,
  type ValueAtRiskSignal,
} from '@/lib/signals/value-at-risk'
import { calculateWeightedValueAtRisk } from '@/lib/signals/signal-ranking'
import type { ConfidenceLevel } from '@prisma/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Fetch all OPEN signals for this company
    const openSignals = await prisma.signal.findMany({
      where: {
        companyId,
        resolutionStatus: 'OPEN',
      },
      select: {
        id: true,
        title: true,
        severity: true,
        confidence: true,
        estimatedValueImpact: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Map Prisma results to the pure function's expected shape
    const signals: ValueAtRiskSignal[] = openSignals.map(s => ({
      id: s.id,
      title: s.title,
      severity: s.severity,
      confidence: s.confidence,
      estimatedValueImpact: s.estimatedValueImpact != null ? Number(s.estimatedValueImpact) : null,
      category: s.category,
      createdAt: s.createdAt,
    }))

    // Calculate historical baseline for trend: signals that were OPEN 30 days ago
    // We approximate this by looking at signals that existed 30 days ago and were not yet resolved
    // Strategy: fetch signals that were created before 30 days ago and either:
    //   (a) are still OPEN, or
    //   (b) were resolved after the 30-day-ago date
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const historicalSignals = await prisma.signal.findMany({
      where: {
        companyId,
        createdAt: { lte: thirtyDaysAgo },
        OR: [
          // Still open
          { resolutionStatus: 'OPEN' },
          // Was open 30 days ago but resolved since
          { resolvedAt: { gt: thirtyDaysAgo } },
        ],
        estimatedValueImpact: { not: null },
      },
      select: {
        estimatedValueImpact: true,
        confidence: true,
      },
    })

    // Calculate previous weighted VaR for trend comparison
    const previousWeightedVaR = historicalSignals.length > 0
      ? calculateWeightedValueAtRisk(
          historicalSignals.map(s => ({
            estimatedValueImpact: s.estimatedValueImpact != null ? Number(s.estimatedValueImpact) : null,
            confidence: s.confidence as ConfidenceLevel,
          }))
        )
      : null

    // Execute the pure aggregation pipeline
    const varResult = calculateValueAtRisk(signals, previousWeightedVaR)

    return NextResponse.json(varResult)
  } catch (error) {
    console.error('[Value-at-Risk] Error calculating value-at-risk:', error)
    return NextResponse.json(
      { error: 'Failed to calculate value-at-risk' },
      { status: 500 }
    )
  }
}
