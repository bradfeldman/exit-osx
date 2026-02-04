import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'

// Alpha constant for non-linear discount calculation (matches recalculate-snapshot.ts)
const ALPHA = 1.4

interface OnboardingSnapshotRequest {
  briScore: number
  categoryScores: Record<string, number>
  valueGapByCategory: Record<string, number>
  currentValue: number
  potentialValue: number
  valueGap: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[ONBOARDING_SNAPSHOT] POST request received')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[ONBOARDING_SNAPSHOT] Unauthorized - no user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params
  console.log(`[ONBOARDING_SNAPSHOT] Company ${companyId} - User ${user.id}`)

  const body: OnboardingSnapshotRequest = await request.json()
  console.log(`[ONBOARDING_SNAPSHOT] Body received - briScore: ${body.briScore}, currentValue: ${body.currentValue}, potentialValue: ${body.potentialValue}, valueGap: ${body.valueGap}`)

  try {
    // Look up the Prisma User by auth ID
    const prismaUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!prismaUser) {
      console.log('[ONBOARDING_SNAPSHOT] Prisma user not found for authId:', user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify company belongs to user
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        organization: {
          users: {
            some: { id: prismaUser.id }
          }
        }
      },
      include: {
        coreFactors: true,
      }
    })

    if (!company) {
      console.log('[ONBOARDING_SNAPSHOT] Company not found or user not in org:', companyId)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get industry multiples for calculating proper base/final multiples
    const multiples = await getIndustryMultiples(
      company.icbSubSector,
      company.icbSector,
      company.icbSuperSector,
      company.icbIndustry
    )

    // Calculate adjusted EBITDA from revenue using industry multiples
    const revenue = Number(company.annualRevenue)
    const adjustedEbitda = estimateEbitdaFromRevenue(revenue, multiples)

    // Calculate Core Score from company factors (should be 1.0 for onboarding defaults)
    const coreFactors = company.coreFactors
    let coreScore = 1.0 // Default for onboarding (all optimal settings)

    if (coreFactors) {
      const factorScores: Record<string, Record<string, number>> = {
        revenueModel: {
          PROJECT_BASED: 0.25,
          TRANSACTIONAL: 0.5,
          RECURRING_CONTRACTS: 0.75,
          SUBSCRIPTION_SAAS: 1.0,
        },
        grossMarginProxy: {
          LOW: 0.25,
          MODERATE: 0.5,
          GOOD: 0.75,
          EXCELLENT: 1.0,
        },
        laborIntensity: {
          VERY_HIGH: 0.25,
          HIGH: 0.5,
          MODERATE: 0.75,
          LOW: 1.0,
        },
        assetIntensity: {
          ASSET_HEAVY: 0.33,
          MODERATE: 0.67,
          ASSET_LIGHT: 1.0,
        },
        ownerInvolvement: {
          CRITICAL: 0.0,
          HIGH: 0.25,
          MODERATE: 0.5,
          LOW: 0.75,
          MINIMAL: 1.0,
        },
      }

      const scores = [
        factorScores.revenueModel[coreFactors.revenueModel] || 0.5,
        factorScores.grossMarginProxy[coreFactors.grossMarginProxy] || 0.5,
        factorScores.laborIntensity[coreFactors.laborIntensity] || 0.5,
        factorScores.assetIntensity[coreFactors.assetIntensity] || 0.5,
        factorScores.ownerInvolvement[coreFactors.ownerInvolvement] || 0.5,
      ]

      coreScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Convert BRI score from 0-100 to 0-1 scale
    const briScoreNormalized = body.briScore / 100

    // Calculate base multiple (positioned by core score within industry range)
    const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)

    // Non-linear discount based on BRI
    const discountFraction = Math.pow(1 - briScoreNormalized, ALPHA)

    // Final multiple with floor guarantee
    const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)

    // USE THE VALUES FROM THE UI - this is what the user saw during onboarding
    // Don't recalculate - the onboarding flow showed these values and we need consistency
    const currentValue = body.currentValue
    const potentialValue = body.potentialValue
    const valueGap = body.valueGap

    console.log(`[ONBOARDING_SNAPSHOT] Company ${companyId}: Storing UI values - currentValue: ${currentValue}, potentialValue: ${potentialValue}, valueGap: ${valueGap}, briScore: ${body.briScore}`)

    // Convert category scores from 0-100 to 0-1 scale
    const getCategoryScoreNormalized = (category: string): number => {
      const score = body.categoryScores[category]
      return score !== undefined ? score / 100 : 0.7 // Default to 70% if not provided
    }

    // Create the snapshot
    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId,
        createdByUserId: prismaUser.id,
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
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
        currentValue,
        potentialValue,
        valueGap,
        alphaConstant: ALPHA,
        snapshotReason: 'Onboarding quick scan completed',
      },
    })

    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      currentValue,
      potentialValue,
      valueGap,
      briScore: body.briScore,
    })
  } catch (error) {
    console.error('Error creating onboarding snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    )
  }
}
