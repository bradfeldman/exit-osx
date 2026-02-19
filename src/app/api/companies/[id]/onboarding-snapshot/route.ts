import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  calculateValuationV2,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import { getMarketSalary } from '@/lib/valuation/recalculate-snapshot'
import { calculateBusinessQualityScore, buildAdjustmentProfile } from '@/lib/valuation/business-quality-score'
import { calculateDealReadinessScore } from '@/lib/valuation/deal-readiness-score'
import { calculateRiskDiscounts, type RiskDiscountInputs } from '@/lib/valuation/risk-discounts'
import { calculateValueGapV2 } from '@/lib/valuation/value-gap-v2'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const onboardingSnapshotSchema = z.object({
  briScore: z.coerce.number().finite().min(0).max(100),
  categoryScores: z.record(z.string(), z.coerce.number().finite().min(0).max(100)),
})

/**
 * PROD-063: Server-side recalculation for onboarding snapshots.
 *
 * The API accepts only raw inputs from the UI (briScore, categoryScores).
 * All valuation math (adjustedEbitda, multiples, currentValue, potentialValue, valueGap)
 * is recalculated server-side using the shared calculateValuation() utility.
 * The client can calculate locally for instant preview, but the database
 * always stores server-verified values.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params

  const validation = await validateRequestBody(request, onboardingSnapshotSchema)
  if (!validation.success) return validation.error

  const { briScore, categoryScores } = validation.data

  try {
    // Look up the Prisma User by auth ID
    const prismaUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify company belongs to user
    // workspace.members is WorkspaceMember[], so we need to match on userId, not id
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        workspace: {
          members: {
            some: { userId: prismaUser.id }
          }
        }
      },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true,
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // --- Server-side recalculation of all valuation inputs ---

    // Get industry multiples for calculating proper base/final multiples
    const multiples = await getIndustryMultiples(
      company.icbSubSector,
      company.icbSector,
      company.icbSuperSector,
      company.icbIndustry
    )

    // Calculate adjusted EBITDA
    // If actual EBITDA exists, use it with adjustments
    // Otherwise, estimate EBITDA from revenue using industry multiples
    const baseEbitda = Number(company.annualEbitda)
    const ownerComp = Number(company.ownerCompensation)
    const addBacks = company.ebitdaAdjustments
      .filter(a => a.type === 'ADD_BACK')
      .reduce((sum, a) => sum + Number(a.amount), 0)
    const deductions = company.ebitdaAdjustments
      .filter(a => a.type === 'DEDUCTION')
      .reduce((sum, a) => sum + Number(a.amount), 0)

    // V2: Bidirectional owner comp — underpaid owner REDUCES adjusted EBITDA
    const revenueSizeCategory = company.coreFactors?.revenueSizeCategory ?? null
    const marketSalaryBenchmark = getMarketSalary(revenueSizeCategory)
    const ownerCompAdjustment = ownerComp - marketSalaryBenchmark

    let adjustedEbitda: number
    if (baseEbitda > 0) {
      adjustedEbitda = baseEbitda + addBacks + ownerCompAdjustment - deductions
    } else {
      const revenue = Number(company.annualRevenue)
      const estimatedEbitda = estimateEbitdaFromRevenue(revenue, multiples)
      adjustedEbitda = estimatedEbitda + addBacks + ownerCompAdjustment - deductions
    }

    // Calculate Core Score using shared utility (should be 1.0 for onboarding defaults)
    const coreFactors = company.coreFactors
    const coreScore = calculateCoreScore(coreFactors as CoreFactors | null)

    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Convert BRI score from 0-100 to 0-1 scale
    const briScoreNormalized = briScore / 100

    // Calculate valuation using shared utility for consistency
    // Server is the source of truth — UI values are only for preview
    const valuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore,
      briScore: briScoreNormalized,
    })

    const { baseMultiple, finalMultiple, discountFraction } = valuation

    // Server-calculated values — these are what get stored
    const currentValue = Math.round(valuation.currentValue)
    const potentialValue = Math.round(valuation.potentialValue)

    // Convert category scores from 0-100 to 0-1 scale
    const getCategoryScoreNormalized = (category: string): number => {
      const score = categoryScores[category]
      return score !== undefined ? score / 100 : 0.7 // Default to 70% if not provided
    }

    // ─── V2 Calculations ──────────────────────────────────────────────
    const transferabilityScore = getCategoryScoreNormalized('TRANSFERABILITY')

    const adjustmentProfile = buildAdjustmentProfile({
      annualRevenue: Number(company.annualRevenue),
      annualEbitda: Number(company.annualEbitda),
      coreFactors: coreFactors ? {
        revenueSizeCategory: coreFactors.revenueSizeCategory,
        revenueModel: coreFactors.revenueModel,
      } : null,
      transferabilityScore,
    })

    const bqsResult = calculateBusinessQualityScore(adjustmentProfile)

    // Build category scores array for DRS
    const drsCategoryScores = [
      { category: 'FINANCIAL', score: getCategoryScoreNormalized('FINANCIAL'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('FINANCIAL') },
      { category: 'TRANSFERABILITY', score: transferabilityScore, totalPoints: 1, earnedPoints: transferabilityScore },
      { category: 'OPERATIONAL', score: getCategoryScoreNormalized('OPERATIONAL'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('OPERATIONAL') },
      { category: 'MARKET', score: getCategoryScoreNormalized('MARKET'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('MARKET') },
      { category: 'LEGAL_TAX', score: getCategoryScoreNormalized('LEGAL_TAX'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('LEGAL_TAX') },
    ]
    const drsResult = calculateDealReadinessScore(drsCategoryScores)

    const riskInputs: RiskDiscountInputs = {
      ownerInvolvement: coreFactors?.ownerInvolvement ?? null,
      transferabilityScore,
      topCustomerConcentration: null,
      top3CustomerConcentration: null,
      legalTaxScore: getCategoryScoreNormalized('LEGAL_TAX'),
      financialScore: getCategoryScoreNormalized('FINANCIAL'),
      revenueSizeCategory: revenueSizeCategory ?? null,
    }
    const riskResult = calculateRiskDiscounts(riskInputs)

    const v2Valuation = calculateValuationV2({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      qualityAdjustments: bqsResult.adjustments,
      riskDiscounts: riskResult.discounts,
      riskMultiplier: riskResult.riskMultiplier,
    })

    const sizeAdj = bqsResult.adjustments.adjustments.find(a => a.factor === 'size_discount')
    const sizeDiscountRate = sizeAdj?.impact ?? 0

    const gapResult = calculateValueGapV2({
      adjustedEbitda,
      industryMedianMultiple: v2Valuation.industryMedianMultiple,
      industryMultipleHigh,
      qualityAdjustedMultiple: v2Valuation.qualityAdjustedMultiple,
      riskAdjustedMultiple: v2Valuation.riskAdjustedMultiple,
      riskDiscounts: riskResult.discounts,
      sizeDiscountRate,
    })

    const dlomDiscount = riskResult.discounts.find(d => d.name.includes('DLOM'))
    const dlomRate = dlomDiscount?.rate ?? 0
    const dlomAmount = v2Valuation.evMid > 0 ? v2Valuation.evMid * dlomRate / (1 - dlomRate) : 0

    const valueGap = Math.round(gapResult.totalGap)

    // Create the snapshot with both V1 and V2 fields
    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId,
        createdByUserId: prismaUser.id,
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        // V1 fields
        coreScore,
        briScore: briScoreNormalized,
        briFinancial: getCategoryScoreNormalized('FINANCIAL'),
        briTransferability: getCategoryScoreNormalized('TRANSFERABILITY'),
        briOperational: getCategoryScoreNormalized('OPERATIONAL'),
        briMarket: getCategoryScoreNormalized('MARKET'),
        briLegalTax: getCategoryScoreNormalized('LEGAL_TAX'),
        briPersonal: getCategoryScoreNormalized('PERSONAL'),
        baseMultiple,
        discountFraction,
        finalMultiple,
        currentValue: v2Valuation.evMid,
        potentialValue,
        valueGap,
        alphaConstant: ALPHA,
        snapshotReason: 'Onboarding quick scan completed',
        // V2 fields
        businessQualityScore: bqsResult.score,
        dealReadinessScore: drsResult.score,
        riskSeverityScore: riskResult.riskSeverityScore,
        industryMedianMultiple: v2Valuation.industryMedianMultiple,
        qualityAdjustedMultiple: v2Valuation.qualityAdjustedMultiple,
        riskAdjustedMultiple: v2Valuation.riskAdjustedMultiple,
        evLow: v2Valuation.evLow,
        evMid: v2Valuation.evMid,
        evHigh: v2Valuation.evHigh,
        spreadFactor: v2Valuation.spreadFactor,
        dlomRate,
        dlomAmount,
        riskDiscounts: riskResult.discounts.map(d => ({
          name: d.name, rate: d.rate, explanation: d.explanation,
        })),
        qualityAdjustments: bqsResult.adjustments.adjustments.map(a => ({
          factor: a.factor, impact: a.impact, explanation: a.explanation,
        })),
        totalQualityAdjustment: v2Valuation.totalQualityAdjustment,
        addressableGap: gapResult.addressableGap,
        structuralGap: gapResult.structuralGap,
        aspirationalGap: gapResult.aspirationalGap,
      },
    })

    // Update company DRS
    await prisma.company.update({
      where: { id: companyId },
      data: {
        dealReadinessScore: drsResult.score,
        dealReadinessUpdatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      currentValue: Math.round(v2Valuation.evMid),
      potentialValue,
      valueGap,
      briScore,
      // V2 fields for UI
      evRange: { low: Math.round(v2Valuation.evLow), mid: Math.round(v2Valuation.evMid), high: Math.round(v2Valuation.evHigh) },
      drsScore: Math.round(drsResult.score * 100),
    })
  } catch (error) {
    console.error('Error creating onboarding snapshot:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    )
  }
}
