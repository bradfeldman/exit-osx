// Task Personalization Context — Data Assembly Layer
// Gathers company financials, industry benchmarks, and core factors
// to power consultant-grade personalized task descriptions.

import { prisma } from '@/lib/prisma'
import { getIndustryMultiples } from '@/lib/valuation/industry-multiples'

// ─── Types ──────────────────────────────────────────────────────────────

export type PersonalizationTier = 'HIGH' | 'MODERATE' | 'LOW'

export interface PersonalizationContext {
  tier: PersonalizationTier
  company: { name: string; industry: string; subSector: string }
  financials: {
    revenue: number
    cogs: number | null
    grossMarginPct: number | null
    ebitda: number
    ebitdaMarginPct: number | null
    source: string
  } | null
  benchmarks: {
    ebitdaMarginLow: number
    ebitdaMarginHigh: number
    ebitdaMultipleLow: number
    ebitdaMultipleHigh: number
    revenueMultipleLow: number
    revenueMultipleHigh: number
    source: string | null
    matchLevel: string
  } | null
  coreFactors: {
    revenueModel: string
    ownerInvolvement: string
    laborIntensity: string
    assetIntensity: string
    grossMarginProxy: string
  } | null
  valueGap: number
  businessDescription: string | null
}

// ─── Main Function ──────────────────────────────────────────────────────

export async function gatherTaskPersonalizationContext(
  companyId: string
): Promise<PersonalizationContext | null> {
  // Fetch company with core factors
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      icbIndustry: true,
      icbSuperSector: true,
      icbSector: true,
      icbSubSector: true,
      businessDescription: true,
      coreFactors: true,
    },
  })

  if (!company) return null

  // Parallel fetches for financials, benchmarks, and valuation
  const [incomeData, benchmarks, snapshot, dossier] = await Promise.all([
    // Latest income statement
    prisma.financialPeriod.findFirst({
      where: { companyId },
      orderBy: { endDate: 'desc' },
      include: { incomeStatement: true },
    }),
    // Industry benchmarks via cascading ICB lookup
    company.icbSubSector
      ? getIndustryMultiples(
          company.icbSubSector,
          company.icbSector ?? undefined,
          company.icbSuperSector ?? undefined,
          company.icbIndustry ?? undefined
        )
      : null,
    // Latest valuation snapshot for value gap
    prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { valueGap: true },
    }),
    // Dossier for business description fallback
    prisma.companyDossier.findFirst({
      where: { companyId, isCurrent: true },
      select: { content: true },
    }),
  ])

  const income = incomeData?.incomeStatement ?? null
  const valueGap = snapshot ? Number(snapshot.valueGap) : 0

  // Business description: prefer company field, fall back to dossier
  let businessDescription = company.businessDescription
  if (!businessDescription && dossier) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = dossier.content as any
    businessDescription = content?.identity?.businessDescription ?? null
  }

  // Build financials block
  let financials: PersonalizationContext['financials'] = null
  if (income) {
    const revenue = Number(income.grossRevenue)
    const periodLabel = incomeData?.label ?? `FY${incomeData?.fiscalYear ?? ''}`
    financials = {
      revenue,
      cogs: Number(income.cogs),
      grossMarginPct: Number(income.grossMarginPct) * 100, // Convert from decimal (0.65) to percent (65)
      ebitda: Number(income.ebitda),
      ebitdaMarginPct: Number(income.ebitdaMarginPct) * 100,
      source: `From your ${periodLabel} P&L`,
    }
  }

  // Build benchmarks block (only if not default)
  let benchmarkData: PersonalizationContext['benchmarks'] = null
  if (benchmarks && !benchmarks.isDefault) {
    benchmarkData = {
      ebitdaMarginLow: benchmarks.ebitdaMarginLow ?? 0,
      ebitdaMarginHigh: benchmarks.ebitdaMarginHigh ?? 0,
      ebitdaMultipleLow: benchmarks.ebitdaMultipleLow,
      ebitdaMultipleHigh: benchmarks.ebitdaMultipleHigh,
      revenueMultipleLow: benchmarks.revenueMultipleLow,
      revenueMultipleHigh: benchmarks.revenueMultipleHigh,
      source: benchmarks.source,
      matchLevel: benchmarks.matchLevel,
    }
  }

  // Build core factors block
  const coreFactors = company.coreFactors
    ? {
        revenueModel: company.coreFactors.revenueModel,
        ownerInvolvement: company.coreFactors.ownerInvolvement,
        laborIntensity: company.coreFactors.laborIntensity,
        assetIntensity: company.coreFactors.assetIntensity,
        grossMarginProxy: company.coreFactors.grossMarginProxy,
      }
    : null

  // Determine tier
  const hasIncome = income !== null
  const hasBenchmarks = benchmarkData !== null && benchmarkData.ebitdaMarginLow > 0
  let tier: PersonalizationTier

  if (hasIncome && hasBenchmarks) {
    tier = 'HIGH'
  } else if ((coreFactors || hasIncome) && hasBenchmarks) {
    tier = 'MODERATE'
  } else {
    tier = 'LOW'
  }

  return {
    tier,
    company: {
      name: company.name,
      industry: company.icbIndustry ?? 'Unknown',
      subSector: company.icbSubSector ?? 'Unknown',
    },
    financials,
    benchmarks: benchmarkData,
    coreFactors,
    valueGap,
    businessDescription,
  }
}
