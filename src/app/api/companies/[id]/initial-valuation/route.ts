import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Lightweight endpoint for onboarding step 3 valuation preview.
 * Calculates valuation range from industry multiples without requiring
 * snapshots, assessments, or complex permission checks.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params

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

    // Calculate valuation using industry multiples
    let adjustedEbitda: number
    let multipleLow: number
    let multipleHigh: number

    if (industryMultiple && revenue > 0) {
      // Calculate implied EBITDA from revenue using industry multiples
      // EV = Revenue × RevMultiple = EBITDA × EbitdaMultiple
      // Therefore: EBITDA = Revenue × (RevMultiple / EbitdaMultiple)
      const revMultipleLow = Number(industryMultiple.revenueMultipleLow)
      const revMultipleHigh = Number(industryMultiple.revenueMultipleHigh)
      const ebitdaMultipleLow = Number(industryMultiple.ebitdaMultipleLow)
      const ebitdaMultipleHigh = Number(industryMultiple.ebitdaMultipleHigh)

      const impliedEbitdaLow = revenue * (revMultipleLow / ebitdaMultipleLow)
      const impliedEbitdaHigh = revenue * (revMultipleHigh / ebitdaMultipleHigh)

      // Use midpoint, rounded to nearest $100,000
      adjustedEbitda = Math.round(((impliedEbitdaLow + impliedEbitdaHigh) / 2) / 100000) * 100000
      multipleLow = ebitdaMultipleLow
      multipleHigh = ebitdaMultipleHigh
    } else {
      // Fallback: 10% margin estimate with default multiples
      adjustedEbitda = Math.round((revenue * 0.10) / 100000) * 100000
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
      multipleLow,
      multipleHigh,
      industryName,
      hasIndustryMultiple: !!industryMultiple,
    })
  } catch (error) {
    console.error('Error calculating initial valuation:', error)
    return NextResponse.json(
      { error: 'Failed to calculate valuation' },
      { status: 500 }
    )
  }
}
