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
        financialPeriods: {
          orderBy: { fiscalYear: 'desc' },
          include: {
            incomeStatement: true,
            adjustments: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const latestSnapshot = company.valuationSnapshots[0]

    // Fetch DCF assumptions to check if DCF value should be used
    // Also fetch EBITDA multiple overrides for custom valuation ranges
    const dcfAssumptions = await prisma.dCFAssumptions.findUnique({
      where: { companyId },
      select: {
        useDCFValue: true,
        enterpriseValue: true,
        equityValue: true,
        ebitdaMultipleLowOverride: true,
        ebitdaMultipleHighOverride: true,
      },
    })

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

    // Fetch task stats with issue tier for sophisticated re-assessment triggers
    const tasks = await prisma.task.findMany({
      where: { companyId },
      select: {
        id: true,
        status: true,
        rawImpact: true,
        briCategory: true,
        deferredUntil: true,
        issueTier: true,
        completedAt: true,
      },
    })

    // Get last assessment completion date
    const lastAssessment = await prisma.assessment.findFirst({
      where: {
        companyId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    })

    const lastAssessmentDate = lastAssessment?.completedAt?.toISOString() ?? null

    // Count tasks completed since last assessment
    const tasksCompletedSinceAssessment = lastAssessmentDate
      ? tasks.filter(t =>
          t.status === 'COMPLETED' &&
          t.completedAt &&
          new Date(t.completedAt) > new Date(lastAssessmentDate)
        ).length
      : tasks.filter(t => t.status === 'COMPLETED').length

    // Count critical and significant tasks for sophisticated triggers
    const criticalTasks = tasks.filter(t => t.issueTier === 'CRITICAL')
    const criticalTasksTotal = criticalTasks.length
    const criticalTasksCompleted = criticalTasks.filter(t => t.status === 'COMPLETED').length

    // Significant tasks = CRITICAL + SIGNIFICANT tier tasks completed since last assessment
    const significantTasksCompleted = lastAssessmentDate
      ? tasks.filter(t =>
          t.status === 'COMPLETED' &&
          t.completedAt &&
          new Date(t.completedAt) > new Date(lastAssessmentDate) &&
          (t.issueTier === 'CRITICAL' || t.issueTier === 'SIGNIFICANT')
        ).length
      : tasks.filter(t =>
          t.status === 'COMPLETED' &&
          (t.issueTier === 'CRITICAL' || t.issueTier === 'SIGNIFICANT')
        ).length

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

    // Calculate Adjusted EBITDA with priority:
    // 1. Financials (appropriate FY's income statement EBITDA + period adjustments)
    // 2. Snapshot EBITDA (from onboarding or previous assessment - maintains consistency)
    // 3. Revenue to EBITDA conversion (using industry multiples)
    // 4. Company Assessment (annualEbitda from company setup)

    const companyRevenue = Number(company.annualRevenue)
    const companyEbitda = Number(company.annualEbitda)

    // Helper to round to nearest $100,000
    const roundToHundredThousand = (value: number) => Math.round(value / 100000) * 100000

    // Determine target fiscal year based on current date
    // - If before July (month < 7): use previous year's FY (just ended)
    // - If July or later (month >= 7): use current year's FY if available, else previous
    // Examples:
    // - Jan 20, 2026 → FY 2025
    // - Aug 13, 2026 → FY 2026 if available, else FY 2025
    // - Mar 15, 2027 → FY 2026
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1 // 1-12

    let targetFiscalYear: number
    let fallbackFiscalYear: number

    if (currentMonth < 7) {
      // First half of year - use previous FY
      targetFiscalYear = currentYear - 1
      fallbackFiscalYear = currentYear - 2
    } else {
      // Second half of year - prefer current FY, fallback to previous
      targetFiscalYear = currentYear
      fallbackFiscalYear = currentYear - 1
    }

    // Find the best matching financial period
    // Periods are already sorted by fiscalYear desc
    let selectedFinancialPeriod = company.financialPeriods.find(
      p => p.fiscalYear === targetFiscalYear && p.incomeStatement
    )
    if (!selectedFinancialPeriod) {
      selectedFinancialPeriod = company.financialPeriods.find(
        p => p.fiscalYear === fallbackFiscalYear && p.incomeStatement
      )
    }
    // If still not found, use the most recent period with income statement
    if (!selectedFinancialPeriod) {
      selectedFinancialPeriod = company.financialPeriods.find(p => p.incomeStatement)
    }

    let adjustedEbitda: number = 0
    let isEbitdaFromFinancials = false
    let isEbitdaEstimated = false
    let selectedFiscalYear: number | null = null

    // Priority 1: Use Financials if available
    if (selectedFinancialPeriod?.incomeStatement) {
      const incomeStmtEbitda = Number(selectedFinancialPeriod.incomeStatement.ebitda) || 0

      // Calculate period-specific adjustments (ADD_BACK - DEDUCTION)
      const periodAdjustments = selectedFinancialPeriod.adjustments || []
      const netAddBacks = periodAdjustments.reduce((sum, adj) => {
        const amount = Number(adj.amount) || 0
        return sum + (adj.type === 'ADD_BACK' ? amount : -amount)
      }, 0)

      adjustedEbitda = incomeStmtEbitda + netAddBacks
      isEbitdaFromFinancials = true
      selectedFiscalYear = selectedFinancialPeriod.fiscalYear

      // Sync company.annualEbitda if P&L EBITDA differs
      // This keeps the company assessment in sync with financials
      if (Math.abs(companyEbitda - incomeStmtEbitda) > 0.01) {
        await prisma.company.update({
          where: { id: companyId },
          data: { annualEbitda: incomeStmtEbitda },
        })
      }
    }
    // Priority 2: Use snapshot's EBITDA if available (maintains consistency with onboarding)
    // This prevents value jumps when user hasn't uploaded financials yet
    else if (latestSnapshot && Number(latestSnapshot.adjustedEbitda) > 0) {
      adjustedEbitda = Number(latestSnapshot.adjustedEbitda)
      isEbitdaEstimated = true // Still considered estimated since not from actual financials
    }
    // Priority 3 (was 2): Revenue to EBITDA conversion using industry multiples
    // Only used when no snapshot exists (e.g., first-time calculation)
    else if (companyRevenue > 0 && industryMultiple) {
      // Calculate implied EBITDA using industry multiples
      // EV = Revenue × RevMultiple = EBITDA × EbitdaMultiple
      // Therefore: EBITDA = Revenue × (RevMultiple / EbitdaMultiple)
      const revMultipleLow = Number(industryMultiple.revenueMultipleLow)
      const revMultipleHigh = Number(industryMultiple.revenueMultipleHigh)
      const ebitdaMultipleLow = Number(industryMultiple.ebitdaMultipleLow)
      const ebitdaMultipleHigh = Number(industryMultiple.ebitdaMultipleHigh)

      const impliedEbitdaLow = companyRevenue * (revMultipleLow / ebitdaMultipleLow)
      const impliedEbitdaHigh = companyRevenue * (revMultipleHigh / ebitdaMultipleHigh)

      // Use midpoint, rounded to nearest $100,000
      adjustedEbitda = roundToHundredThousand((impliedEbitdaLow + impliedEbitdaHigh) / 2)
      isEbitdaEstimated = true
    }
    // Priority 4: Company Assessment (annualEbitda + company-level adjustments)
    else if (companyEbitda > 0) {
      // Use company's stated EBITDA plus any company-level adjustments
      const companyAdjustmentTotal = company.ebitdaAdjustments.reduce((sum, adj) => {
        const baseAmount = Number(adj.amount)
        const annualizedAmount = adj.frequency === 'MONTHLY' ? baseAmount * 12 : baseAmount
        return adj.type === 'DEDUCTION' ? sum - annualizedAmount : sum + annualizedAmount
      }, 0)

      adjustedEbitda = companyEbitda + companyAdjustmentTotal
    }
    // Priority 5 (Fallback): Use revenue with 10% margin estimate
    else if (companyRevenue > 0) {
      // No industry multiples available, use 10% margin as rough estimate
      adjustedEbitda = roundToHundredThousand(companyRevenue * 0.10)
      isEbitdaEstimated = true
    }

    // Pre-calculate estimated multiple for companies without snapshot
    // This is used in both tier1 and tier2
    // Check for custom EBITDA multiple overrides from DCF settings
    const hasMultipleOverride = dcfAssumptions?.ebitdaMultipleLowOverride != null &&
                                dcfAssumptions?.ebitdaMultipleHighOverride != null
    const multipleLow = hasMultipleOverride
      ? Number(dcfAssumptions.ebitdaMultipleLowOverride)
      : (industryMultiple ? Number(industryMultiple.ebitdaMultipleLow) : 3.0)
    const multipleHigh = hasMultipleOverride
      ? Number(dcfAssumptions.ebitdaMultipleHighOverride)
      : (industryMultiple ? Number(industryMultiple.ebitdaMultipleHigh) : 6.0)
    const calculatedCoreScore = calculateCoreScore(company.coreFactors)
    const estimatedMultiple = calculatedCoreScore !== null
      ? multipleLow + calculatedCoreScore * (multipleHigh - multipleLow)
      : (multipleLow + multipleHigh) / 2

    // Check if DCF value should be used (calculate once for both tier1 and tier2)
    const useDCF = dcfAssumptions?.useDCFValue === true && !!dcfAssumptions?.enterpriseValue
    const dcfEnterpriseValue = useDCF && dcfAssumptions?.enterpriseValue
      ? Number(dcfAssumptions.enterpriseValue)
      : null

    // Calculate the implied multiple when using DCF
    const dcfImpliedMultiple = dcfEnterpriseValue && adjustedEbitda > 0
      ? dcfEnterpriseValue / adjustedEbitda
      : null

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        annualRevenue: Number(company.annualRevenue),
        annualEbitda: Number(company.annualEbitda),
        adjustedEbitda,
      },
      // Tier 1: Core KPIs
      // Always recalculate valuations using the fresh adjustedEbitda
      // Use snapshot for BRI score, Core Score, and multiples - but recalculate dollar values
      // UNLESS useDCFValue is enabled - then use DCF enterprise value
      tier1: (() => {
        if (latestSnapshot) {
          // Use override multiples if set, otherwise use snapshot's original industry multiples
          const effectiveMultipleLow = hasMultipleOverride
            ? multipleLow
            : Number(latestSnapshot.industryMultipleLow)
          const effectiveMultipleHigh = hasMultipleOverride
            ? multipleHigh
            : Number(latestSnapshot.industryMultipleHigh)

          // Recalculate the final multiple using the effective range and the snapshot's scores
          const snapshotCoreScore = Number(latestSnapshot.coreScore)
          const snapshotBriScore = Number(latestSnapshot.briScore)
          const ALPHA = 1.4

          // Recalculate base and final multiples using the (possibly overridden) range
          const baseMultiple = effectiveMultipleLow + snapshotCoreScore * (effectiveMultipleHigh - effectiveMultipleLow)
          const discountFraction = Math.pow(1 - snapshotBriScore, ALPHA)
          const recalculatedFinalMultiple = effectiveMultipleLow + (baseMultiple - effectiveMultipleLow) * (1 - discountFraction)

          // If using DCF, use that value and calculate implied multiple
          // Otherwise, use EBITDA × recalculated multiple
          const currentValue = dcfEnterpriseValue ?? (adjustedEbitda * recalculatedFinalMultiple)
          const impliedMultiple = dcfImpliedMultiple ?? recalculatedFinalMultiple
          const potentialValue = adjustedEbitda * effectiveMultipleHigh
          // Value gap: positive when below potential, zero when at or above
          const valueGap = Math.max(0, potentialValue - currentValue)
          // Market premium: positive when above potential (DCF exceeds industry max)
          const marketPremium = Math.max(0, currentValue - potentialValue)

          return {
            currentValue,
            potentialValue,
            valueGap,
            marketPremium,
            briScore: Math.round(snapshotBriScore * 100),
            coreScore: Math.round(snapshotCoreScore * 100),
            finalMultiple: impliedMultiple,
            multipleRange: {
              low: effectiveMultipleLow,
              high: effectiveMultipleHigh,
            },
            industryName: buildIndustryPath(company),
            isEstimated: false,
            useDCFValue: useDCF,
            hasCustomMultiples: hasMultipleOverride,
          }
        } else {
          // No snapshot - estimate values based on industry multiples (or overrides)
          // Still respect DCF value if enabled
          const currentValue = dcfEnterpriseValue ?? (adjustedEbitda * estimatedMultiple)
          const impliedMultiple = dcfImpliedMultiple ?? estimatedMultiple
          const potentialValue = adjustedEbitda * multipleHigh
          // Value gap: positive when below potential, zero when at or above
          const valueGap = Math.max(0, potentialValue - currentValue)
          // Market premium: positive when above potential (DCF exceeds industry max)
          const marketPremium = Math.max(0, currentValue - potentialValue)

          return {
            currentValue,
            potentialValue,
            valueGap,
            marketPremium,
            briScore: null, // No BRI score without assessment
            coreScore: calculatedCoreScore !== null ? Math.round(calculatedCoreScore * 100) : null,
            finalMultiple: impliedMultiple,
            multipleRange: {
              low: multipleLow,
              high: multipleHigh,
            },
            industryName: buildIndustryPath(company),
            isEstimated: !useDCF,
            useDCFValue: useDCF,
            hasCustomMultiples: hasMultipleOverride,
          }
        }
      })(),
      // Tier 2: Value Drivers
      // Priority: 1. Financials, 2. Revenue conversion, 3. Company Assessment
      tier2: (() => {
        // Recalculate current multiple for tier2 if we have a snapshot and overrides
        let tier2CurrentMultiple = estimatedMultiple
        if (latestSnapshot) {
          if (hasMultipleOverride) {
            // Recalculate with override range
            const snapshotCoreScore = Number(latestSnapshot.coreScore)
            const snapshotBriScore = Number(latestSnapshot.briScore)
            const ALPHA = 1.4
            const baseMultiple = multipleLow + snapshotCoreScore * (multipleHigh - multipleLow)
            const discountFraction = Math.pow(1 - snapshotBriScore, ALPHA)
            tier2CurrentMultiple = multipleLow + (baseMultiple - multipleLow) * (1 - discountFraction)
          } else {
            tier2CurrentMultiple = Number(latestSnapshot.finalMultiple)
          }
        }

        return {
          adjustedEbitda,
          isEbitdaEstimated,
          isEbitdaFromFinancials,
          ebitdaSource: isEbitdaFromFinancials
            ? 'financials'
            : isEbitdaEstimated
              ? 'revenue_conversion'
              : 'company_assessment',
          fiscalYear: selectedFiscalYear, // Which FY the EBITDA is from (null if not from financials)
          multipleRange: {
            low: multipleLow,
            high: multipleHigh,
            current: dcfImpliedMultiple ?? tier2CurrentMultiple,
          },
          hasCustomMultiples: hasMultipleOverride,
        }
      })(),
      // Tier 3: Risk Breakdown
      tier3: latestSnapshot ? {
        categories: [
          { key: 'FINANCIAL', label: 'Financial', score: Math.round(Number(latestSnapshot.briFinancial) * 100) },
          { key: 'TRANSFERABILITY', label: 'Transferability', score: Math.round(Number(latestSnapshot.briTransferability) * 100) },
          { key: 'OPERATIONAL', label: 'Operational', score: Math.round(Number(latestSnapshot.briOperational) * 100) },
          { key: 'MARKET', label: 'Market', score: Math.round(Number(latestSnapshot.briMarket) * 100) },
          { key: 'LEGAL_TAX', label: 'Legal/Tax', score: Math.round(Number(latestSnapshot.briLegalTax) * 100) },
          { key: 'PERSONAL', label: 'Personal', score: Math.round(Number(latestSnapshot.briPersonal) * 100) },
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
      // Re-assessment trigger data
      lastAssessmentDate,
      tasksCompletedSinceAssessment,
      criticalTasksTotal,
      criticalTasksCompleted,
      significantTasksCompleted,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
