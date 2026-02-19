/**
 * GET /api/companies/[id]/playbook-recommendations
 *
 * Returns ranked playbook recommendations based on the company's latest
 * ValuationSnapshot scores (DRS categories, RSS risk discounts, BQS quality
 * adjustments) and current playbook activity.
 *
 * Auth: Requires COMPANY_VIEW permission on the company.
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import {
  recommendPlaybooks,
  type DRSCategoryInput,
  type RiskDiscountInput,
  type QualityAdjustmentInput,
} from '@/lib/playbook/playbook-recommendations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Fetch latest ValuationSnapshot for DRS/RSS/BQS data
    const snapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        adjustedEbitda: true,
        briFinancial: true,
        briTransferability: true,
        briOperational: true,
        briMarket: true,
        briLegalTax: true,
        briPersonal: true,
        riskDiscounts: true,
        qualityAdjustments: true,
      },
    })

    if (!snapshot) {
      return NextResponse.json({
        recommendations: [],
        needsAssessment: true,
      })
    }

    // Fetch company for annual revenue
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { annualRevenue: true },
    })

    // Fetch active/completed playbook slugs
    const companyPlaybooks = await prisma.companyPlaybook.findMany({
      where: {
        companyId,
        status: { in: ['IN_PROGRESS', 'COMPLETED'] },
      },
      select: {
        playbook: { select: { slug: true } },
      },
    })

    // Build DRS categories from snapshot BRI fields
    const drsCategories: DRSCategoryInput[] = [
      { category: 'FINANCIAL', score: Number(snapshot.briFinancial), weight: 0.25 },
      { category: 'TRANSFERABILITY', score: Number(snapshot.briTransferability), weight: 0.20 },
      { category: 'OPERATIONAL', score: Number(snapshot.briOperational), weight: 0.20 },
      { category: 'MARKET', score: Number(snapshot.briMarket), weight: 0.15 },
      { category: 'LEGAL_TAX', score: Number(snapshot.briLegalTax), weight: 0.10 },
      { category: 'PERSONAL', score: Number(snapshot.briPersonal), weight: 0.10 },
    ]

    // Parse RSS risk discounts from snapshot JSON
    const riskDiscounts: RiskDiscountInput[] = Array.isArray(snapshot.riskDiscounts)
      ? (snapshot.riskDiscounts as Array<{ name: string; rate: number; explanation: string }>).map(
          (d) => ({
            name: d.name,
            rate: Number(d.rate),
            explanation: d.explanation,
          })
        )
      : []

    // Parse BQS quality adjustments from snapshot JSON
    const qualityAdjustments: QualityAdjustmentInput[] = Array.isArray(
      snapshot.qualityAdjustments
    )
      ? (
          snapshot.qualityAdjustments as Array<{
            factor: string
            name: string
            impact: number
            category: string
          }>
        ).map((a) => ({
          factor: a.factor,
          name: a.name,
          impact: Number(a.impact),
          category: a.category,
        }))
      : []

    const activePlaybookSlugs = companyPlaybooks.map((cp) => cp.playbook.slug)

    const recommendations = recommendPlaybooks({
      drsCategories,
      riskDiscounts,
      qualityAdjustments,
      companyProfile: {
        adjustedEbitda: Number(snapshot.adjustedEbitda),
        annualRevenue: Number(company?.annualRevenue ?? 0),
      },
      activePlaybookSlugs,
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error(
      '[Playbook Recommendations] Error:',
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json(
      { error: 'Failed to generate playbook recommendations' },
      { status: 500 }
    )
  }
}
