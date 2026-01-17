import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

// Helper to format ICB code to readable name
function formatIcbName(code: string | null): string | null {
  if (!code) return null
  return code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Build full industry classification path
function buildIndustryPath(company: {
  icbIndustry: string | null
  icbSuperSector: string | null
  icbSector: string | null
  icbSubSector: string | null
}): string {
  const parts = [
    formatIcbName(company.icbIndustry),
    formatIcbName(company.icbSuperSector),
    formatIcbName(company.icbSector),
    formatIcbName(company.icbSubSector),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : 'General Industry'
}

// Calculate Core Score from core factors (0-1 scale)
function calculateCoreScore(coreFactors: {
  revenueSizeCategory: string
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
} | null): number | null {
  if (!coreFactors) return null

  const factorScores: Record<string, Record<string, number>> = {
    revenueSizeCategory: {
      UNDER_500K: 0.2,
      FROM_500K_TO_1M: 0.4,
      FROM_1M_TO_3M: 0.6,
      FROM_3M_TO_10M: 0.8,
      FROM_10M_TO_25M: 0.9,
      OVER_25M: 1.0,
    },
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
    factorScores.revenueSizeCategory[coreFactors.revenueSizeCategory] ?? 0.5,
    factorScores.revenueModel[coreFactors.revenueModel] ?? 0.5,
    factorScores.grossMarginProxy[coreFactors.grossMarginProxy] ?? 0.5,
    factorScores.laborIntensity[coreFactors.laborIntensity] ?? 0.5,
    factorScores.assetIntensity[coreFactors.assetIntensity] ?? 0.5,
    factorScores.ownerInvolvement[coreFactors.ownerInvolvement] ?? 0.5,
  ]

  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Fetch company with latest snapshot, industry multiple, and core factors
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 6, // Last 6 for sparkline
        },
        ebitdaAdjustments: true,
        coreFactors: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const latestSnapshot = company.valuationSnapshots[0]

    // Fetch industry multiple range - prioritize most specific match
    let industryMultiple = null
    if (company.icbSubSector) {
      // Try exact sub-sector match first
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbSubSector: company.icbSubSector },
      })
    }
    if (!industryMultiple && company.icbSector) {
      // Fall back to sector match
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbSector: company.icbSector },
      })
    }
    if (!industryMultiple && company.icbSuperSector) {
      // Fall back to super-sector match
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbSuperSector: company.icbSuperSector },
      })
    }
    if (!industryMultiple && company.icbIndustry) {
      // Fall back to industry match
      industryMultiple = await prisma.industryMultiple.findFirst({
        where: { icbIndustry: company.icbIndustry },
      })
    }

    // Fetch task stats
    const tasks = await prisma.task.findMany({
      where: { companyId },
      select: {
        id: true,
        status: true,
        rawImpact: true,
        briCategory: true,
        deferredUntil: true,
      },
    })

    const taskStats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      totalValue: tasks.reduce((sum, t) => sum + Number(t.rawImpact), 0),
      completedValue: tasks
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.rawImpact), 0),
      recoverableValue: tasks
        .filter(t => t.status !== 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.rawImpact), 0),
      atRisk: tasks.filter(t =>
        t.deferredUntil && new Date(t.deferredUntil) < new Date()
      ).length,
    }

    // Fetch current sprint
    const currentSprint = await prisma.sprint.findFirst({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            rawImpact: true,
          },
        },
      },
    })

    // Calculate sprint progress
    let sprintProgress = null
    if (currentSprint) {
      const sprintTasks = currentSprint.tasks
      sprintProgress = {
        id: currentSprint.id,
        name: currentSprint.name,
        totalTasks: sprintTasks.length,
        completedTasks: sprintTasks.filter(t => t.status === 'COMPLETED').length,
        recoverableValue: sprintTasks
          .filter(t => t.status !== 'COMPLETED')
          .reduce((sum, t) => sum + Number(t.rawImpact), 0),
        startDate: currentSprint.startDate,
        endDate: currentSprint.endDate,
      }
    }

    // Calculate top 3 constraints from lowest BRI scores
    const constraints: { category: string; score: number; label: string }[] = []
    if (latestSnapshot) {
      const briScores = [
        { category: 'FINANCIAL', score: Number(latestSnapshot.briFinancial), label: 'Financial Health' },
        { category: 'TRANSFERABILITY', score: Number(latestSnapshot.briTransferability), label: 'Transferability' },
        { category: 'OPERATIONAL', score: Number(latestSnapshot.briOperational), label: 'Operations' },
        { category: 'MARKET', score: Number(latestSnapshot.briMarket), label: 'Market Position' },
        { category: 'LEGAL_TAX', score: Number(latestSnapshot.briLegalTax), label: 'Legal & Tax' },
        { category: 'PERSONAL', score: Number(latestSnapshot.briPersonal), label: 'Personal Readiness' },
      ]
      briScores.sort((a, b) => a.score - b.score)
      constraints.push(...briScores.slice(0, 3))
    }

    // Calculate BRI trend
    let briTrend = null
    if (company.valuationSnapshots.length >= 2) {
      const current = Number(company.valuationSnapshots[0].briScore)
      const previous = Number(company.valuationSnapshots[1].briScore)
      briTrend = {
        direction: current >= previous ? 'up' : 'down',
        change: Math.round((current - previous) * 100),
      }
    }

    // Calculate value trend for sparkline
    const valueTrend = company.valuationSnapshots
      .slice()
      .reverse()
      .map(s => ({
        value: Number(s.currentValue),
        date: s.createdAt.toISOString(),
      }))

    // Calculate exit readiness window (rough estimate based on BRI score trajectory)
    let exitWindow = null
    if (latestSnapshot) {
      const briScore = Number(latestSnapshot.briScore)
      if (briScore >= 0.8) {
        exitWindow = 'Ready now'
      } else if (briScore >= 0.6) {
        exitWindow = '6-12 months'
      } else if (briScore >= 0.4) {
        exitWindow = '12-18 months'
      } else {
        exitWindow = '18-24 months'
      }
    }

    // Use snapshot's adjusted EBITDA if available (includes owner comp normalization)
    // Otherwise calculate from company data, or estimate from revenue using industry multiples
    const companyEbitda = Number(company.annualEbitda)
    const companyRevenue = Number(company.annualRevenue)
    // Calculate adjustment total: add ADD_BACKs, subtract DEDUCTIONs
    // Annualize monthly amounts (multiply by 12)
    const adjustmentTotal = company.ebitdaAdjustments.reduce((sum, adj) => {
      const baseAmount = Number(adj.amount)
      const annualizedAmount = adj.frequency === 'MONTHLY' ? baseAmount * 12 : baseAmount
      return adj.type === 'DEDUCTION' ? sum - annualizedAmount : sum + annualizedAmount
    }, 0)

    // Helper to round to nearest $100,000
    const roundToHundredThousand = (value: number) => Math.round(value / 100000) * 100000

    // If no EBITDA provided, estimate using industry-specific implied margin
    // Derived from relationship between revenue multiples and EBITDA multiples:
    // EV = Revenue × RevMultiple = EBITDA × EbitdaMultiple
    // Therefore: EBITDA = Revenue × (RevMultiple / EbitdaMultiple)
    let estimatedEbitda: number
    if (companyEbitda > 0) {
      estimatedEbitda = companyEbitda
    } else if (industryMultiple) {
      // Calculate implied EBITDA at low and high ends, then average
      const revMultipleLow = Number(industryMultiple.revenueMultipleLow)
      const revMultipleHigh = Number(industryMultiple.revenueMultipleHigh)
      const ebitdaMultipleLow = Number(industryMultiple.ebitdaMultipleLow)
      const ebitdaMultipleHigh = Number(industryMultiple.ebitdaMultipleHigh)

      const impliedEbitdaLow = companyRevenue * (revMultipleLow / ebitdaMultipleLow)
      const impliedEbitdaHigh = companyRevenue * (revMultipleHigh / ebitdaMultipleHigh)
      // Round estimated EBITDA to nearest $100,000
      estimatedEbitda = roundToHundredThousand((impliedEbitdaLow + impliedEbitdaHigh) / 2)
    } else {
      // Fallback to 10% if no industry data, rounded to nearest $100,000
      estimatedEbitda = roundToHundredThousand(companyRevenue * 0.10)
    }

    // When estimated (no snapshot), round the final adjusted EBITDA to nearest $100,000
    const adjustedEbitda = latestSnapshot
      ? Number(latestSnapshot.adjustedEbitda)
      : roundToHundredThousand(estimatedEbitda + adjustmentTotal)

    // Pre-calculate estimated multiple for companies without snapshot
    // This is used in both tier1 and tier2
    const multipleLow = industryMultiple ? Number(industryMultiple.ebitdaMultipleLow) : 3.0
    const multipleHigh = industryMultiple ? Number(industryMultiple.ebitdaMultipleHigh) : 6.0
    const calculatedCoreScore = calculateCoreScore(company.coreFactors)
    const estimatedMultiple = calculatedCoreScore !== null
      ? multipleLow + calculatedCoreScore * (multipleHigh - multipleLow)
      : (multipleLow + multipleHigh) / 2

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        annualRevenue: Number(company.annualRevenue),
        annualEbitda: Number(company.annualEbitda),
        adjustedEbitda,
      },
      // Tier 1: Core KPIs
      // When no snapshot, show estimated values based on industry multiples
      tier1: latestSnapshot ? {
        currentValue: Number(latestSnapshot.currentValue),
        potentialValue: Number(latestSnapshot.potentialValue),
        valueGap: Number(latestSnapshot.valueGap),
        briScore: Math.round(Number(latestSnapshot.briScore) * 100),
        // Core Score (0-100) where higher = better structural factors = lower risk
        // Based on: revenue size, revenue model, gross margin,
        // labor intensity, asset intensity, owner involvement
        coreScore: Math.round(Number(latestSnapshot.coreScore) * 100),
        finalMultiple: Number(latestSnapshot.finalMultiple),
        multipleRange: {
          low: Number(latestSnapshot.industryMultipleLow),
          high: Number(latestSnapshot.industryMultipleHigh),
        },
        industryName: buildIndustryPath(company),
        isEstimated: false,
      } : (() => {
        // Estimate tier1 values when no assessment exists
        // Use pre-calculated values (multipleLow, multipleHigh, calculatedCoreScore, estimatedMultiple)
        const currentValue = adjustedEbitda * estimatedMultiple
        const potentialValue = adjustedEbitda * multipleHigh

        return {
          currentValue,
          potentialValue,
          valueGap: potentialValue - currentValue,
          briScore: null, // No BRI score without assessment
          coreScore: calculatedCoreScore !== null ? Math.round(calculatedCoreScore * 100) : null,
          finalMultiple: estimatedMultiple,
          multipleRange: {
            low: multipleLow,
            high: multipleHigh,
          },
          industryName: buildIndustryPath(company),
          isEstimated: true,
        }
      })(),
      // Tier 2: Value Drivers
      // EBITDA is estimated from revenue when annualEbitda is 0
      tier2: {
        adjustedEbitda,
        isEbitdaEstimated: Number(company.annualEbitda) === 0,
        multipleRange: latestSnapshot ? {
          low: Number(latestSnapshot.industryMultipleLow),
          high: Number(latestSnapshot.industryMultipleHigh),
          current: Number(latestSnapshot.finalMultiple),
        } : {
          low: multipleLow,
          high: multipleHigh,
          current: estimatedMultiple, // Show the core-score-based multiple on the range
        },
      },
      // Tier 3: Risk Breakdown
      tier3: latestSnapshot ? {
        categories: [
          { key: 'financial', label: 'Financial', score: Math.round(Number(latestSnapshot.briFinancial) * 100) },
          { key: 'transferability', label: 'Transferability', score: Math.round(Number(latestSnapshot.briTransferability) * 100) },
          { key: 'operational', label: 'Operational', score: Math.round(Number(latestSnapshot.briOperational) * 100) },
          { key: 'market', label: 'Market', score: Math.round(Number(latestSnapshot.briMarket) * 100) },
          { key: 'legalTax', label: 'Legal/Tax', score: Math.round(Number(latestSnapshot.briLegalTax) * 100) },
          { key: 'personal', label: 'Personal', score: Math.round(Number(latestSnapshot.briPersonal) * 100) },
        ],
        topConstraints: constraints.map(c => ({
          category: c.label,
          score: Math.round(c.score * 100),
        })),
      } : null,
      // Tier 4: Execution & Momentum
      tier4: {
        taskStats,
        sprintProgress,
      },
      // Tier 5: Trends
      tier5: {
        valueTrend,
        briTrend,
        exitWindow,
      },
      hasAssessment: !!latestSnapshot,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
