import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'

/**
 * PROD-063: Server-side recalculation for onboarding snapshots.
 *
 * The API accepts only raw inputs from the UI (briScore, categoryScores).
 * All valuation math (adjustedEbitda, multiples, currentValue, potentialValue, valueGap)
 * is recalculated server-side using the shared calculateValuation() utility.
 * The client can calculate locally for instant preview, but the database
 * always stores server-verified values.
 */
interface OnboardingSnapshotRequest {
  /** BRI score on 0-100 scale */
  briScore: number
  /** Per-category BRI scores on 0-100 scale */
  categoryScores: Record<string, number>
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
  console.log(`[ONBOARDING_SNAPSHOT] Body received - briScore: ${body.briScore}`)

  // Validate required fields
  if (typeof body.briScore !== 'number' || body.briScore < 0 || body.briScore > 100) {
    return NextResponse.json(
      { error: 'briScore must be a number between 0 and 100' },
      { status: 400 }
    )
  }

  if (!body.categoryScores || typeof body.categoryScores !== 'object') {
    return NextResponse.json(
      { error: 'categoryScores is required' },
      { status: 400 }
    )
  }

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
      }
    })

    if (!company) {
      console.log('[ONBOARDING_SNAPSHOT] Company not found or user not in org:', companyId)
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

    // Calculate adjusted EBITDA from revenue using industry multiples
    const revenue = Number(company.annualRevenue)
    const adjustedEbitda = estimateEbitdaFromRevenue(revenue, multiples)

    // Calculate Core Score using shared utility (should be 1.0 for onboarding defaults)
    const coreFactors = company.coreFactors
    const coreScore = calculateCoreScore(coreFactors as CoreFactors | null)

    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Convert BRI score from 0-100 to 0-1 scale
    const briScoreNormalized = body.briScore / 100

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
    const valueGap = Math.round(valuation.valueGap)

    console.log(`[ONBOARDING_SNAPSHOT] Company ${companyId}: Server-calculated values - currentValue: ${currentValue}, potentialValue: ${potentialValue}, valueGap: ${valueGap}, briScore: ${body.briScore}, adjustedEbitda: ${adjustedEbitda}, coreScore: ${coreScore}`)

    // Convert category scores from 0-100 to 0-1 scale
    const getCategoryScoreNormalized = (category: string): number => {
      const score = body.categoryScores[category]
      return score !== undefined ? score / 100 : 0.7 // Default to 70% if not provided
    }

    // Create the snapshot with server-calculated values only
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
