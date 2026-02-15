import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { estimateEbitdaFromRevenue, type MultipleResult } from '@/lib/valuation/industry-multiples'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

/**
 * Lightweight endpoint for onboarding step 3 valuation preview.
 * Calculates valuation range from industry multiples without requiring
 * snapshots, assessments, or complex permission checks.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  // SECURITY FIX (SEC-038): Verify workspace membership to prevent IDOR
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Get company with minimal data needed for valuation calculation
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        annualRevenue: true,
        icbIndustry: true,
        icbSuperSector: true,
        icbSector: true,
        icbSubSector: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const revenue = Number(company.annualRevenue)

    // Find industry multiple - prioritize most specific match (sub-sector → sector → super-sector → industry)
    let industryMultiple = null
    if (company.icbSubSector) {
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbSubSector: company.icbSubSector },
      })
    }
    if (!industryMultiple && company.icbSector) {
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbSector: company.icbSector },
      })
    }
    if (!industryMultiple && company.icbSuperSector) {
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbSuperSector: company.icbSuperSector },
      })
    }
    if (!industryMultiple && company.icbIndustry) {
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbIndustry: company.icbIndustry },
      })
    }

    // Calculate valuation using industry multiples and EBITDA margin ranges
    let adjustedEbitda: number
    let multipleLow: number
    let multipleHigh: number
    let ebitdaMarginUsed: number

    if (industryMultiple && revenue > 0) {
      const ebitdaMultipleLow = Number(industryMultiple.ebitdaMultipleLow)
      const ebitdaMultipleHigh = Number(industryMultiple.ebitdaMultipleHigh)

      // Use stored EBITDA margin ranges if available, otherwise use estimateEbitdaFromRevenue
      const marginLow = industryMultiple.ebitdaMarginLow
        ? Number(industryMultiple.ebitdaMarginLow) / 100
        : null
      const marginHigh = industryMultiple.ebitdaMarginHigh
        ? Number(industryMultiple.ebitdaMarginHigh) / 100
        : null

      if (marginLow !== null && marginHigh !== null) {
        // Use stored industry-specific EBITDA margin (midpoint of range)
        ebitdaMarginUsed = (marginLow + marginHigh) / 2
        adjustedEbitda = Math.round((revenue * ebitdaMarginUsed) / 100000) * 100000
      } else {
        // Use the same formula as onboarding-snapshot for consistency
        const multiples: MultipleResult = {
          ebitdaMultipleLow,
          ebitdaMultipleHigh,
          revenueMultipleLow: Number(industryMultiple.revenueMultipleLow),
          revenueMultipleHigh: Number(industryMultiple.revenueMultipleHigh),
          source: industryMultiple.source,
          isDefault: false,
          matchLevel: 'subsector',
        }
        adjustedEbitda = estimateEbitdaFromRevenue(revenue, multiples)
        ebitdaMarginUsed = revenue > 0 ? adjustedEbitda / revenue : 0
      }

      multipleLow = ebitdaMultipleLow
      multipleHigh = ebitdaMultipleHigh
    } else {
      // Fallback: 10% margin estimate with default multiples
      ebitdaMarginUsed = 0.10
      adjustedEbitda = Math.round((revenue * ebitdaMarginUsed) / 100000) * 100000
      multipleLow = 3.5
      multipleHigh = 5.5
    }

    const valuationLow = adjustedEbitda * multipleLow
    const valuationHigh = adjustedEbitda * multipleHigh

    // Format industry name from ICB code
    const industryName = company.icbSubSector
      ? company.icbSubSector.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      : 'General Industry'

    return NextResponse.json({
      valuationLow: Math.round(valuationLow),
      valuationHigh: Math.round(valuationHigh),
      adjustedEbitda,
      ebitdaMarginPercent: Math.round(ebitdaMarginUsed * 1000) / 10, // e.g., 7.5%
      multipleLow,
      multipleHigh,
      industryName,
      hasIndustryMultiple: !!industryMultiple,
    })
  } catch (error) {
    console.error('Error calculating initial valuation:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to calculate valuation' },
      { status: 500 }
    )
  }
}
