import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { formatIcbName } from '@/lib/utils/format-icb'

// --- Buyer explanations for Valuation Bridge ---
const BUYER_EXPLANATIONS: Record<string, string> = {
  FINANCIAL: 'Buyers pay less when financial records lack depth or consistency.',
  TRANSFERABILITY: "Buyers discount businesses that can't run without the owner.",
  OPERATIONAL: 'Buyers see risk in businesses without documented, repeatable processes.',
  MARKET: 'Buyers pay premiums for defensible market positions and diverse revenue.',
  LEGAL_TAX: 'Buyers walk away from unresolved legal exposure and compliance gaps.',
}

// --- Buyer consequence templates (fallback when AI not available) ---
const BUYER_CONSEQUENCE_TEMPLATES: Record<string, string> = {
  FINANCIAL: 'Buyers pay less when they can\'t verify the numbers. Documenting this strengthens financial credibility.',
  TRANSFERABILITY: 'Buyers discount businesses that depend on the owner. This proves the business runs without you.',
  OPERATIONAL: 'Buyers see risk in ad-hoc processes. Documenting this shows the business is scalable.',
  MARKET: 'Buyers pay premiums for market defensibility. This strengthens your competitive position.',
  LEGAL_TAX: 'Buyers walk away from unresolved compliance gaps. This removes a deal-breaker.',
  PERSONAL: 'Exit readiness signals commitment to the process. This shows you\'re serious.',
}

// --- BRI weights for bridge calculation ---
const BRI_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.25,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.15,
}

// --- Timeline annotation helpers ---
function getAnnotationLabel(reason: string | null): string | null {
  if (!reason) return null
  const labels: Record<string, string> = {
    onboarding_complete: 'Initial valuation',
    assessment_complete: 'Assessment completed',
    financials_connected: 'Financials connected',
    task_completed: 'Task completed',
    reassessment_complete: 'Re-assessment completed',
    dcf_calculated: 'DCF valuation added',
    manual_recalculation: 'Valuation updated',
    financial_period_added: 'New financial period',
  }
  return labels[reason] ?? null
}

function getAnnotationDetail(reason: string | null, valueDelta: number, briDelta: number): string {
  if (!reason) return ''
  const details: Record<string, string> = {
    onboarding_complete: 'Your exit journey begins with this baseline valuation.',
    assessment_complete: `BRI assessment reveals your buyer readiness profile.${briDelta ? ` BRI moved ${briDelta > 0 ? '+' : ''}${Math.round(briDelta)} points.` : ''}`,
    financials_connected: 'Valuation accuracy improved with real financials.',
    task_completed: `Action completed.${valueDelta ? ` Value impact: ${valueDelta > 0 ? '+' : ''}$${Math.abs(Math.round(valueDelta / 1000))}K.` : ''}`,
    reassessment_complete: `Updated assessment reflects your progress.${briDelta ? ` BRI moved ${briDelta > 0 ? '+' : ''}${Math.round(briDelta)} points.` : ''}`,
    dcf_calculated: 'DCF model provides an independent valuation perspective.',
    manual_recalculation: 'Valuation recalculated with updated inputs.',
    financial_period_added: 'New financial data incorporated into valuation.',
  }
  return details[reason] ?? ''
}

function formatImpact(valueDelta: number, briDelta: number): string {
  const parts: string[] = []
  if (valueDelta) {
    const sign = valueDelta > 0 ? '+' : '-'
    parts.push(`${sign}$${Math.abs(Math.round(valueDelta / 1000))}K`)
  }
  if (briDelta) {
    parts.push(`${briDelta > 0 ? '+' : ''}${Math.round(briDelta)} BRI points`)
  }
  return parts.join(', ') || 'Baseline'
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
// NOTE: revenueSizeCategory is intentionally EXCLUDED because revenue already
// affects valuation through the EBITDA × multiple calculation.
// Including it would double-count revenue impact.
// This matches the calculation in calculate-valuation.ts and recalculate-snapshot.ts
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
    console.log(`[DASHBOARD] Company ${companyId}: latestSnapshot exists: ${!!latestSnapshot}, snapshot count: ${company.valuationSnapshots.length}`)

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

    // --- Value-at-risk aggregation ---
    // Wrapped in try/catch because signal and value_ledger_entries tables
    // may not exist yet if migrations haven't been run
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    let lifetimeRecovered: { _sum: { deltaValueRecovered: unknown } } = { _sum: { deltaValueRecovered: null } }
    let openSignalRisk: { _sum: { estimatedValueImpact: unknown }; _count: number } = { _sum: { estimatedValueImpact: null }, _count: 0 }
    let monthlyLedger: { _sum: { deltaValueRecovered: unknown; deltaValueAtRisk: unknown }; _count: number } = { _sum: { deltaValueRecovered: null, deltaValueAtRisk: null }, _count: 0 }

    try {
      ;[lifetimeRecovered, openSignalRisk, monthlyLedger] = await Promise.all([
        // Lifetime recovered from ledger
        prisma.valueLedgerEntry.aggregate({
          where: { companyId },
          _sum: { deltaValueRecovered: true },
        }),
        // Current at-risk from OPEN signals
        prisma.signal.aggregate({
          where: {
            companyId,
            resolutionStatus: 'OPEN',
            estimatedValueImpact: { not: null },
          },
          _sum: { estimatedValueImpact: true },
          _count: true,
        }),
        // This month's ledger activity
        prisma.valueLedgerEntry.aggregate({
          where: {
            companyId,
            occurredAt: { gte: monthStart },
          },
          _sum: {
            deltaValueRecovered: true,
            deltaValueAtRisk: true,
          },
          _count: true,
        }),
      ])
    } catch {
      // Tables don't exist yet — use defaults initialized above
    }

    // --- NEW: Value Gap Delta (30-day comparison) ---
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const previousSnapshot = company.valuationSnapshots.length > 1
      ? await prisma.valuationSnapshot.findFirst({
          where: {
            companyId,
            createdAt: { lte: thirtyDaysAgo },
          },
          orderBy: { createdAt: 'desc' },
        })
      : null

    const currentValueGap = latestSnapshot ? Number(latestSnapshot.valueGap) : 0
    const valueGapDelta = previousSnapshot
      ? currentValueGap - Number(previousSnapshot.valueGap)
      : null

    // --- NEW: Valuation Bridge Categories ---
    const bridgeCategories = (() => {
      if (!latestSnapshot) return []
      const valueGap = Number(latestSnapshot.valueGap)
      if (valueGap <= 0) return []

      const categories = [
        { key: 'FINANCIAL', score: Number(latestSnapshot.briFinancial), label: 'Financial Health' },
        { key: 'TRANSFERABILITY', score: Number(latestSnapshot.briTransferability), label: 'Transferability' },
        { key: 'OPERATIONAL', score: Number(latestSnapshot.briOperational), label: 'Operations' },
        { key: 'MARKET', score: Number(latestSnapshot.briMarket), label: 'Market Position' },
        { key: 'LEGAL_TAX', score: Number(latestSnapshot.briLegalTax), label: 'Legal & Tax' },
      ]

      const rawGaps = categories.map(c => ({
        ...c,
        weight: BRI_WEIGHTS[c.key] || 0,
        rawGap: (1 - c.score) * (BRI_WEIGHTS[c.key] || 0),
      }))

      const totalRawGap = rawGaps.reduce((sum, c) => sum + c.rawGap, 0)

      return rawGaps
        .map(c => ({
          category: c.key,
          label: c.label,
          score: Math.round(c.score * 100),
          dollarImpact: totalRawGap > 0
            ? Math.round((c.rawGap / totalRawGap) * valueGap)
            : 0,
          weight: c.weight,
          buyerExplanation: BUYER_EXPLANATIONS[c.key] || '',
        }))
        .sort((a, b) => b.dollarImpact - a.dollarImpact)
    })()

    // --- NEW: Next Move Task ---
    const inProgressTask = await prisma.task.findFirst({
      where: { companyId, status: 'IN_PROGRESS' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        briCategory: true,
        estimatedHours: true,
        rawImpact: true,
        status: true,
        buyerConsequence: true,
        effortLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const nextPendingTask = inProgressTask || await prisma.task.findFirst({
      where: {
        companyId,
        status: 'PENDING',
        inActionPlan: true,
      },
      orderBy: [
        { priorityRank: 'asc' },
        { estimatedHours: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        briCategory: true,
        estimatedHours: true,
        rawImpact: true,
        status: true,
        buyerConsequence: true,
        effortLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const comingUpTasks = nextPendingTask ? await prisma.task.findMany({
      where: {
        companyId,
        status: 'PENDING',
        inActionPlan: true,
        id: { not: nextPendingTask.id },
      },
      orderBy: [
        { priorityRank: 'asc' },
        { estimatedHours: 'asc' },
      ],
      take: 2,
      select: {
        id: true,
        title: true,
        estimatedHours: true,
        rawImpact: true,
        briCategory: true,
      },
    }) : []

    // --- NEW: Timeline Annotations ---
    const allSnapshots = await prisma.valuationSnapshot.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const annotations = allSnapshots
      .map((snapshot, index) => {
        const prev = allSnapshots[index + 1]
        const valueDelta = prev
          ? Number(snapshot.currentValue) - Number(prev.currentValue)
          : 0
        const briDelta = prev
          ? (Number(snapshot.briScore) - Number(prev.briScore)) * 100
          : 0

        const label = getAnnotationLabel(snapshot.snapshotReason)
        if (!label) return null

        return {
          date: snapshot.createdAt.toISOString(),
          label,
          detail: getAnnotationDetail(snapshot.snapshotReason, valueDelta, briDelta),
          impact: formatImpact(valueDelta, briDelta),
          type: valueDelta > 0 ? 'positive' as const : valueDelta < 0 ? 'negative' as const : 'neutral' as const,
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        annualRevenue: Number(company.annualRevenue),
        annualEbitda: Number(company.annualEbitda),
        adjustedEbitda,
      },
      // Tier 1: Core KPIs
      // When no financials have been uploaded, use snapshot's stored values directly
      // When financials are uploaded OR using DCF OR custom multiples, recalculate
      tier1: (() => {
        if (latestSnapshot) {
          // Use override multiples if set, otherwise use snapshot's original industry multiples
          const effectiveMultipleLow = hasMultipleOverride
            ? multipleLow
            : Number(latestSnapshot.industryMultipleLow)
          const effectiveMultipleHigh = hasMultipleOverride
            ? multipleHigh
            : Number(latestSnapshot.industryMultipleHigh)

          const snapshotCoreScore = Number(latestSnapshot.coreScore)
          const snapshotBriScore = Number(latestSnapshot.briScore)

          // Determine if we should use snapshot values directly or recalculate
          // Use snapshot values when: no financials, no DCF, no custom multiples
          // This prevents valuation jumps after onboarding
          const shouldUseSnapshotValues = !isEbitdaFromFinancials && !useDCF && !hasMultipleOverride

          if (shouldUseSnapshotValues) {
            // Use snapshot's stored values directly - these were calculated consistently during onboarding/task completion
            const currentValue = Number(latestSnapshot.currentValue)
            const potentialValue = Number(latestSnapshot.potentialValue)
            const valueGap = Number(latestSnapshot.valueGap)
            const marketPremium = Math.max(0, currentValue - potentialValue)

            console.log(`[DASHBOARD] Company ${companyId}: Using snapshot values - currentValue: ${currentValue}, potentialValue: ${potentialValue}, valueGap: ${valueGap}, isEbitdaFromFinancials: ${isEbitdaFromFinancials}, useDCF: ${useDCF}, hasMultipleOverride: ${hasMultipleOverride}`)

            return {
              currentValue,
              potentialValue,
              valueGap,
              marketPremium,
              briScore: Math.round(snapshotBriScore * 100),
              coreScore: Math.round(snapshotCoreScore * 100),
              finalMultiple: Number(latestSnapshot.finalMultiple),
              multipleRange: {
                low: effectiveMultipleLow,
                high: effectiveMultipleHigh,
              },
              industryName: buildIndustryPath(company),
              isEstimated: false,
              useDCFValue: false,
              hasCustomMultiples: false,
            }
          }

          // Recalculate values when financials, DCF, or custom multiples are used
          console.log(`[DASHBOARD] Company ${companyId}: RECALCULATING values - isEbitdaFromFinancials: ${isEbitdaFromFinancials}, useDCF: ${useDCF}, hasMultipleOverride: ${hasMultipleOverride}, adjustedEbitda: ${adjustedEbitda}`)
          const ALPHA = 1.4

          // Recalculate base and final multiples using the (possibly overridden) range
          const baseMultiple = effectiveMultipleLow + snapshotCoreScore * (effectiveMultipleHigh - effectiveMultipleLow)
          const discountFraction = Math.pow(1 - snapshotBriScore, ALPHA)
          const recalculatedFinalMultiple = effectiveMultipleLow + (baseMultiple - effectiveMultipleLow) * (1 - discountFraction)

          // If using DCF, use that value and calculate implied multiple
          // Otherwise, use EBITDA × recalculated multiple
          const currentValue = dcfEnterpriseValue ?? (adjustedEbitda * recalculatedFinalMultiple)
          const impliedMultiple = dcfImpliedMultiple ?? recalculatedFinalMultiple
          const industryBasedPotential = adjustedEbitda * effectiveMultipleHigh

          // When DCF value exceeds industry-based potential, show DCF as both current and potential
          // This prevents the confusing situation where "potential" < "current"
          const potentialValue = useDCF && currentValue > industryBasedPotential
            ? currentValue
            : industryBasedPotential

          // Value gap: positive when below potential, zero when at or above
          const valueGap = Math.max(0, potentialValue - currentValue)
          // Market premium: positive when DCF exceeds industry max (indicates premium valuation)
          const marketPremium = useDCF ? Math.max(0, currentValue - industryBasedPotential) : 0

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
          const industryBasedPotential = adjustedEbitda * multipleHigh

          // When DCF value exceeds industry-based potential, show DCF as both current and potential
          const potentialValue = useDCF && currentValue > industryBasedPotential
            ? currentValue
            : industryBasedPotential

          // Value gap: positive when below potential, zero when at or above
          const valueGap = Math.max(0, potentialValue - currentValue)
          // Market premium: positive when DCF exceeds industry max (indicates premium valuation)
          const marketPremium = useDCF ? Math.max(0, currentValue - industryBasedPotential) : 0

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
      },
      // Tier 5: Trends
      tier5: {
        valueTrend,
        briTrend,
        exitWindow,
        annotations,
      },
      // Value Home: Bridge data
      bridgeCategories,
      // Value Home: Value gap delta
      valueGapDelta,
      previousValueGap: previousSnapshot ? Number(previousSnapshot.valueGap) : null,
      // Value Home: Progress Context
      progressContext: {
        valueRecoveredLifetime: Number(lifetimeRecovered._sum.deltaValueRecovered ?? 0),
        valueAtRiskCurrent: Number(openSignalRisk._sum.estimatedValueImpact ?? 0),
        openSignalCount: openSignalRisk._count,
        valueRecoveredThisMonth: Number(monthlyLedger._sum.deltaValueRecovered ?? 0),
        valueAtRiskThisMonth: Number(monthlyLedger._sum.deltaValueAtRisk ?? 0),
        ledgerEventsThisMonth: monthlyLedger._count,
      },
      // Value Home: Next Move
      nextMove: {
        task: nextPendingTask ? {
          id: nextPendingTask.id,
          title: nextPendingTask.title,
          description: nextPendingTask.description,
          briCategory: nextPendingTask.briCategory,
          estimatedHours: nextPendingTask.estimatedHours,
          rawImpact: Number(nextPendingTask.rawImpact),
          status: nextPendingTask.status,
          buyerConsequence: nextPendingTask.buyerConsequence
            || BUYER_CONSEQUENCE_TEMPLATES[nextPendingTask.briCategory]
            || null,
          effortLevel: nextPendingTask.effortLevel,
          startedAt: nextPendingTask.status === 'IN_PROGRESS'
            ? nextPendingTask.updatedAt.toISOString()
            : null,
        } : null,
        comingUp: comingUpTasks.map(t => ({
          id: t.id,
          title: t.title,
          estimatedHours: t.estimatedHours,
          rawImpact: Number(t.rawImpact),
          briCategory: t.briCategory,
        })),
      },
      coreFactors: company.coreFactors ? {
        revenueModel: company.coreFactors.revenueModel,
        grossMarginProxy: company.coreFactors.grossMarginProxy,
        laborIntensity: company.coreFactors.laborIntensity,
        assetIntensity: company.coreFactors.assetIntensity,
        ownerInvolvement: company.coreFactors.ownerInvolvement,
      } : null,
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
