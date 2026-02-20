import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError, type AuthSuccess } from '@/lib/auth/check-permission'
import { formatIcbName } from '@/lib/utils/format-icb'
import {
  calculateCoreScore as calculateCoreScoreShared,
  calculateValuation,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import { calculateCategoryValueGaps } from '@/lib/valuation/value-gap-attribution'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import { calculateWeightedValueAtRisk } from '@/lib/signals/signal-ranking'
import { calculateValueAtRisk, type ValueAtRiskSignal } from '@/lib/signals/value-at-risk'

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
// Uses DEFAULT_BRI_WEIGHTS imported from @/lib/bri-weights for consistency
// Previous version had incorrect weights (TRANSFERABILITY: 0.25, LEGAL_TAX: 0.15, missing PERSONAL)
const BRI_WEIGHTS: Record<string, number> = DEFAULT_BRI_WEIGHTS

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
// Delegates to shared utility in calculate-valuation.ts
// Returns null if no core factors exist (dashboard needs to distinguish "no data" from "low score")
function calculateCoreScore(coreFactors: {
  revenueSizeCategory: string
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
} | null): number | null {
  if (!coreFactors) return null
  return calculateCoreScoreShared(coreFactors as CoreFactors)
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
            balanceSheet: true,
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

    // Fetch personal financials for business ownership percentage
    const userId = (result as AuthSuccess).auth.user.id
    const personalFinancials = await prisma.personalFinancials.findUnique({
      where: { userId },
      select: { businessOwnership: true },
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

    // Calculate value trend for sparkline (include dcfValue for dual-line)
    const valueTrend = company.valuationSnapshots
      .slice()
      .reverse()
      .map(s => ({
        value: Number(s.currentValue),
        date: s.createdAt.toISOString(),
        dcfValue: s.dcfEnterpriseValue ? Number(s.dcfEnterpriseValue) : null,
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
    let openSignalsList: Array<{ id: string; title: string; severity: string; estimatedValueImpact: unknown; confidence: string; category: string | null; createdAt: Date }> = []
    let monthlyLedger: { _sum: { deltaValueRecovered: unknown; deltaValueAtRisk: unknown }; _count: number } = { _sum: { deltaValueRecovered: null, deltaValueAtRisk: null }, _count: 0 }

    try {
      ;[lifetimeRecovered, openSignalsList, monthlyLedger] = await Promise.all([
        // Lifetime recovered from ledger
        prisma.valueLedgerEntry.aggregate({
          where: { companyId },
          _sum: { deltaValueRecovered: true },
        }),
        // PROD-021/022: Fetch open signals with full fields for both
        // confidence weighting and value-at-risk aggregation
        prisma.signal.findMany({
          where: {
            companyId,
            resolutionStatus: 'OPEN',
          },
          select: {
            id: true,
            title: true,
            severity: true,
            estimatedValueImpact: true,
            confidence: true,
            category: true,
            createdAt: true,
          },
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

    // PROD-021: Apply confidence weighting to signal value-at-risk
    // PROD-022: Also compute full VaR aggregation (top threats, by-category, trend)
    const varSignals: ValueAtRiskSignal[] = openSignalsList.map(s => ({
      id: s.id,
      title: s.title,
      severity: s.severity as import('@prisma/client').SignalSeverity,
      confidence: s.confidence as import('@prisma/client').ConfidenceLevel,
      estimatedValueImpact: s.estimatedValueImpact != null ? Number(s.estimatedValueImpact) : null,
      category: s.category as import('@prisma/client').BriCategory | null,
      createdAt: s.createdAt,
    }))

    // Backward-compatible: signals that have value impact for the existing weighting
    const signalsWithImpact = varSignals.filter(s => s.estimatedValueImpact != null)
    const openSignalCount = openSignalsList.length
    const weightedValueAtRisk = calculateWeightedValueAtRisk(
      signalsWithImpact.map(s => ({
        estimatedValueImpact: s.estimatedValueImpact,
        confidence: s.confidence,
      }))
    )

    // PROD-022: Full value-at-risk aggregation (used for valueAtRisk response section)
    const varResult = calculateValueAtRisk(varSignals)

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

    // --- Valuation Bridge Categories (PROD-016 fix: uses shared utility for reconciliation) ---
    // PROD-070: Bridge now uses the same totalValueGap as tier1 hero metrics.
    // The BRI-driven portion is distributed across 5 categories.
    // The remaining Core Score gap is shown as a "Business Structure" bar.
    const bridgeCategories = (() => {
      if (!latestSnapshot) return []

      const CATEGORY_LABELS: Record<string, string> = {
        FINANCIAL: 'Financial Health',
        TRANSFERABILITY: 'Transferability',
        OPERATIONAL: 'Operations',
        MARKET: 'Market Position',
        LEGAL_TAX: 'Legal & Tax',
      }

      // V2: Use pre-computed gap decomposition from snapshot
      const v2AddressableGap = latestSnapshot.addressableGap != null ? Number(latestSnapshot.addressableGap) : null
      const v2StructuralGap = latestSnapshot.structuralGap != null ? Number(latestSnapshot.structuralGap) : null
      const v2AspirationalGap = latestSnapshot.aspirationalGap != null ? Number(latestSnapshot.aspirationalGap) : null

      const categoryInputs = [
        { category: 'FINANCIAL', score: Number(latestSnapshot.briFinancial), weight: BRI_WEIGHTS['FINANCIAL'] || 0 },
        { category: 'TRANSFERABILITY', score: Number(latestSnapshot.briTransferability), weight: BRI_WEIGHTS['TRANSFERABILITY'] || 0 },
        { category: 'OPERATIONAL', score: Number(latestSnapshot.briOperational), weight: BRI_WEIGHTS['OPERATIONAL'] || 0 },
        { category: 'MARKET', score: Number(latestSnapshot.briMarket), weight: BRI_WEIGHTS['MARKET'] || 0 },
        { category: 'LEGAL_TAX', score: Number(latestSnapshot.briLegalTax), weight: BRI_WEIGHTS['LEGAL_TAX'] || 0 },
      ]

      if (v2AddressableGap != null && v2AddressableGap >= 0) {
        // V2 path: distribute the addressable gap across BRI categories
        const gaps = calculateCategoryValueGaps(categoryInputs, v2AddressableGap)

        const result = gaps.map(g => ({
          category: g.category,
          label: CATEGORY_LABELS[g.category] || g.category,
          score: Math.round(g.score * 100),
          dollarImpact: g.dollarImpact,
          weight: g.weight,
          buyerExplanation: BUYER_EXPLANATIONS[g.category] || '',
        }))

        // Add structural gap bar (DLOM + size — cannot be reduced)
        if (v2StructuralGap && v2StructuralGap > 0) {
          result.push({
            category: 'STRUCTURAL',
            label: 'Market & Size Factors',
            score: 0, // Structural gaps don't have a "score"
            dollarImpact: Math.round(v2StructuralGap),
            weight: 0,
            buyerExplanation: 'Discounts for company size and lack of marketability. These are standard for private businesses and reduce with scale.',
          })
        }

        // Add aspirational gap bar (quality improvement to industry ceiling)
        if (v2AspirationalGap && v2AspirationalGap > 0) {
          result.push({
            category: 'ASPIRATIONAL',
            label: 'Growth Potential',
            score: 0,
            dollarImpact: Math.round(v2AspirationalGap),
            weight: 0,
            buyerExplanation: 'The upside from improving business quality metrics (margins, growth, recurring revenue) toward industry leaders.',
          })
        }

        return result
      }

      // V1 fallback: proportional BRI attribution
      const snapshotCoreScore = Number(latestSnapshot.coreScore)
      const snapshotBriScore = Number(latestSnapshot.briScore)

      const effectiveMultipleLow = hasMultipleOverride
        ? multipleLow
        : Number(latestSnapshot.industryMultipleLow)
      const effectiveMultipleHigh = hasMultipleOverride
        ? multipleHigh
        : Number(latestSnapshot.industryMultipleHigh)

      const recalculated = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: effectiveMultipleLow,
        industryMultipleHigh: effectiveMultipleHigh,
        coreScore: snapshotCoreScore,
        briScore: snapshotBriScore,
      })

      const multipleBasedForBridge = recalculated.currentValue
      const currentValueForBridge = dcfEnterpriseValue
        ? (multipleBasedForBridge + dcfEnterpriseValue) / 2
        : multipleBasedForBridge
      const potentialValueForBridge = adjustedEbitda * effectiveMultipleHigh
      const totalValueGap = Math.max(0, potentialValueForBridge - currentValueForBridge)

      if (totalValueGap <= 0) return []

      const briGap = Math.max(0, recalculated.potentialValue - recalculated.currentValue)
      const coreGap = Math.max(0, totalValueGap - briGap)

      const gaps = calculateCategoryValueGaps(categoryInputs, briGap)

      const result = gaps.map(g => ({
        category: g.category,
        label: CATEGORY_LABELS[g.category] || g.category,
        score: Math.round(g.score * 100),
        dollarImpact: g.dollarImpact,
        weight: g.weight,
        buyerExplanation: BUYER_EXPLANATIONS[g.category] || '',
      }))

      if (coreGap > 0) {
        result.push({
          category: 'CORE_STRUCTURE',
          label: 'Business Structure',
          score: Math.round(snapshotCoreScore * 100),
          dollarImpact: Math.round(coreGap),
          weight: 0,
          buyerExplanation: 'Your business model, margins, and owner involvement determine your base position in the industry range.',
        })
      }

      return result
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
      // PROD-062: Always recalculate fresh using calculateValuation()
      // Snapshots are for historical comparison only, not current value display.
      // This eliminates value "jumps" when users upload financials, enable DCF, or set custom multiples.
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

          // Always recalculate using shared calculateValuation() for consistency
          const recalculated = calculateValuation({
            adjustedEbitda,
            industryMultipleLow: effectiveMultipleLow,
            industryMultipleHigh: effectiveMultipleHigh,
            coreScore: snapshotCoreScore,
            briScore: snapshotBriScore,
          })

          // Enterprise Value: when DCF is enabled, blend as midpoint of EBITDA-multiple and DCF
          // rather than using DCF as standalone (QA: DCF should not be standalone selection method)
          const multipleBasedValue = recalculated.currentValue
          const industryBasedPotential = adjustedEbitda * effectiveMultipleHigh

          let currentValue: number
          let impliedMultiple: number
          if (dcfEnterpriseValue && dcfEnterpriseValue > 0) {
            // Midpoint blend of EBITDA-multiple and DCF enterprise values
            currentValue = Math.max(0, (multipleBasedValue + dcfEnterpriseValue) / 2)
            impliedMultiple = adjustedEbitda > 0 ? currentValue / adjustedEbitda : recalculated.finalMultiple
          } else {
            currentValue = Math.max(0, multipleBasedValue)
            impliedMultiple = recalculated.finalMultiple
          }

          const potentialValue = Math.max(0, industryBasedPotential)

          // Value gap: positive when below potential, zero when at or above
          const valueGap = Math.max(0, potentialValue - currentValue)
          // Market premium: positive when blended value exceeds industry max
          const marketPremium = dcfEnterpriseValue ? Math.max(0, currentValue - industryBasedPotential) : 0

          // PROD-062: Sync latest snapshot so ValuationTicker (/api/progression) stays in sync.
          // Snapshots can go stale when EBITDA changes (financials uploaded, adjustments, etc.)
          // but no new snapshot is created. Fire-and-forget to avoid blocking the response.
          const storedValue = Number(latestSnapshot.currentValue)
          if (Math.abs(storedValue - currentValue) > 1) {
            prisma.valuationSnapshot.update({
              where: { id: latestSnapshot.id },
              data: {
                currentValue,
                valueGap,
                adjustedEbitda,
              },
            }).catch(err => console.error('[Dashboard] Failed to sync snapshot:', err))
          }

          // V2 scores from snapshot (written by recalculate-snapshot.ts)
          const bqsScore = latestSnapshot.businessQualityScore != null
            ? Math.round(Number(latestSnapshot.businessQualityScore) * 100)
            : null
          const drsScore = latestSnapshot.dealReadinessScore != null
            ? Math.round(Number(latestSnapshot.dealReadinessScore) * 100)
            : null
          const rssScore = latestSnapshot.riskSeverityScore != null
            ? Math.round(Number(latestSnapshot.riskSeverityScore) * 100)
            : null

          // V2 EV range from snapshot
          const evLow = latestSnapshot.evLow != null ? Number(latestSnapshot.evLow) : null
          const evMid = latestSnapshot.evMid != null ? Number(latestSnapshot.evMid) : null
          const evHigh = latestSnapshot.evHigh != null ? Number(latestSnapshot.evHigh) : null

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
            multipleSource: industryMultiple?.source ?? null,
            multipleAsOf: industryMultiple?.effectiveDate?.toISOString() ?? null,
            // V2 fields
            bqsScore,
            drsScore,
            rssScore,
            evRange: evLow != null && evHigh != null
              ? { low: evLow, mid: evMid ?? currentValue, high: evHigh }
              : null,
            riskDiscounts: latestSnapshot.riskDiscounts as Array<{ name: string; rate: number; explanation: string }> | null,
            qualityAdjustments: latestSnapshot.qualityAdjustments as Array<{ factor: string; impact: number; explanation: string }> | null,
          }
        } else {
          // No snapshot - estimate values based on industry multiples (or overrides)
          // When DCF exists, blend as midpoint with EBITDA-multiple estimate
          const multipleBasedValue = adjustedEbitda * estimatedMultiple
          const industryBasedPotential = adjustedEbitda * multipleHigh

          let currentValue: number
          let impliedMultiple: number
          if (dcfEnterpriseValue && dcfEnterpriseValue > 0) {
            currentValue = Math.max(0, (multipleBasedValue + dcfEnterpriseValue) / 2)
            impliedMultiple = adjustedEbitda > 0 ? currentValue / adjustedEbitda : estimatedMultiple
          } else {
            currentValue = Math.max(0, multipleBasedValue)
            impliedMultiple = estimatedMultiple
          }

          const potentialValue = Math.max(0, industryBasedPotential)

          // Value gap: positive when below potential, zero when at or above
          const valueGap = Math.max(0, potentialValue - currentValue)
          // Market premium: positive when blended value exceeds industry max
          const marketPremium = dcfEnterpriseValue ? Math.max(0, currentValue - industryBasedPotential) : 0

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
            isEstimated: !dcfEnterpriseValue,
            useDCFValue: useDCF,
            hasCustomMultiples: hasMultipleOverride,
            multipleSource: industryMultiple?.source ?? null,
            multipleAsOf: industryMultiple?.effectiveDate?.toISOString() ?? null,
            // V2 fields — null when no snapshot
            bqsScore: null,
            drsScore: null,
            rssScore: null,
            evRange: null,
            riskDiscounts: null,
            qualityAdjustments: null,
          }
        }
      })(),
      // Tier 2: Value Drivers
      // Priority: 1. Financials, 2. Revenue conversion, 3. Company Assessment
      // PROD-062: Always recalculate current multiple fresh (consistent with tier1)
      tier2: (() => {
        let tier2CurrentMultiple = estimatedMultiple
        if (latestSnapshot) {
          const effectiveMultipleLow = hasMultipleOverride
            ? multipleLow
            : Number(latestSnapshot.industryMultipleLow)
          const effectiveMultipleHigh = hasMultipleOverride
            ? multipleHigh
            : Number(latestSnapshot.industryMultipleHigh)
          const snapshotCoreScore = Number(latestSnapshot.coreScore)
          const snapshotBriScore = Number(latestSnapshot.briScore)
          const tier2Recalculated = calculateValuation({
            adjustedEbitda: 1, // Only need the multiple, EBITDA doesn't affect it
            industryMultipleLow: effectiveMultipleLow,
            industryMultipleHigh: effectiveMultipleHigh,
            coreScore: snapshotCoreScore,
            briScore: snapshotBriScore,
          })
          tier2CurrentMultiple = tier2Recalculated.finalMultiple
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
      // Value Home: Top signals for SignalSummaryCard
      topSignals: openSignalsList.slice(0, 4).map(s => ({
        id: s.id,
        title: s.title,
        severity: s.severity,
        category: s.category,
        createdAt: s.createdAt.toISOString(),
        estimatedValueImpact: s.estimatedValueImpact ? Number(s.estimatedValueImpact) : null,
      })),
      // Value Home: Progress Context
      // PROD-021: valueAtRiskCurrent is now confidence-weighted
      progressContext: {
        valueRecoveredLifetime: Number(lifetimeRecovered._sum.deltaValueRecovered ?? 0),
        valueAtRiskCurrent: weightedValueAtRisk,
        openSignalCount,
        valueRecoveredThisMonth: Number(monthlyLedger._sum.deltaValueRecovered ?? 0),
        valueAtRiskThisMonth: Number(monthlyLedger._sum.deltaValueAtRisk ?? 0),
        ledgerEventsThisMonth: monthlyLedger._count,
      },
      // PROD-022: Full value-at-risk breakdown (top threats, by-category, trend)
      valueAtRisk: {
        totalValueAtRisk: varResult.totalValueAtRisk,
        rawValueAtRisk: varResult.rawValueAtRisk,
        signalCount: varResult.signalCount,
        topThreats: varResult.topThreats,
        byCategory: varResult.byCategory,
        trend: varResult.trend,
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
        coreScore: calculatedCoreScore,
      } : null,
      // Proceeds waterfall inputs
      proceedsInputs: (() => {
        // Current value: replicate tier1 logic
        let currentValue = 0
        if (latestSnapshot) {
          const effectiveMultipleLow = hasMultipleOverride ? multipleLow : Number(latestSnapshot.industryMultipleLow)
          const effectiveMultipleHigh = hasMultipleOverride ? multipleHigh : Number(latestSnapshot.industryMultipleHigh)
          const recalc = calculateValuation({
            adjustedEbitda,
            industryMultipleLow: effectiveMultipleLow,
            industryMultipleHigh: effectiveMultipleHigh,
            coreScore: Number(latestSnapshot.coreScore),
            briScore: Number(latestSnapshot.briScore),
          })
          currentValue = dcfEnterpriseValue
            ? Math.max(0, (recalc.currentValue + dcfEnterpriseValue) / 2)
            : Math.max(0, recalc.currentValue)
        } else {
          const multipleBasedValue = adjustedEbitda * estimatedMultiple
          currentValue = dcfEnterpriseValue
            ? Math.max(0, (multipleBasedValue + dcfEnterpriseValue) / 2)
            : Math.max(0, multipleBasedValue)
        }

        // Net debt: snapshot dcfNetDebt → balance sheet → 0
        let netDebt = 0
        if (latestSnapshot?.dcfNetDebt != null) {
          netDebt = Number(latestSnapshot.dcfNetDebt)
        } else if (selectedFinancialPeriod?.balanceSheet) {
          const bs = selectedFinancialPeriod.balanceSheet
          netDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd) - Number(bs.cash)
        }

        // Ownership: from PersonalFinancials.businessOwnership JSON → default 100
        let ownershipPercent = 100
        if (personalFinancials?.businessOwnership) {
          const ownership = personalFinancials.businessOwnership as { percentage?: number }
          if (typeof ownership.percentage === 'number') {
            ownershipPercent = ownership.percentage
          }
        }

        return {
          currentValue,
          netDebt,
          ownershipPercent,
          entityType: company.entityType ?? null,
        }
      })(),
      hasAssessment: !!latestSnapshot,
      // Auto-DCF valuation (from snapshot pipeline)
      dcfValuation: (() => {
        if (!latestSnapshot?.dcfEnterpriseValue) return null

        const dcfEV = Number(latestSnapshot.dcfEnterpriseValue)
        const multipleBasedValue = latestSnapshot
          ? Number(latestSnapshot.currentValue)
          : 0

        const divergenceRatio = multipleBasedValue > 0
          ? Math.abs(dcfEV - multipleBasedValue) / multipleBasedValue
          : null

        let confidenceSignal: 'high' | 'moderate' | 'low' = 'low'
        if (divergenceRatio !== null) {
          if (divergenceRatio < 0.15) confidenceSignal = 'high'
          else if (divergenceRatio < 0.35) confidenceSignal = 'moderate'
        }

        return {
          enterpriseValue: dcfEV,
          equityValue: latestSnapshot.dcfEquityValue ? Number(latestSnapshot.dcfEquityValue) : null,
          wacc: latestSnapshot.dcfWacc ? Number(latestSnapshot.dcfWacc) : null,
          impliedMultiple: latestSnapshot.dcfImpliedMultiple ? Number(latestSnapshot.dcfImpliedMultiple) : null,
          source: (latestSnapshot.dcfSource as 'auto' | 'manual') ?? 'auto',
          multipleBasedValue,
          divergenceRatio,
          confidenceSignal,
        }
      })(),
      // Since-last-visit events
      sinceLastVisit: await (async () => {
        try {
          const userId = (result as AuthSuccess).auth.user.id
          const lastSession = await prisma.userSession.findFirst({
            where: { userId, revokedAt: null },
            orderBy: { lastActiveAt: 'desc' },
            select: { lastActiveAt: true },
          })
          if (!lastSession) return []

          const sinceDate = lastSession.lastActiveAt
          const events: Array<{ type: string; message: string; date: string }> = []

          // Market multiple changes since last visit
          const marketSignals = await prisma.signal.findMany({
            where: {
              companyId,
              eventType: 'MARKET_MULTIPLE_CHANGE',
              createdAt: { gt: sinceDate },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { title: true, createdAt: true },
          })
          for (const s of marketSignals) {
            events.push({ type: 'market', message: s.title, date: s.createdAt.toISOString() })
          }

          // New valuation snapshots since last visit
          const newSnapshots = await prisma.valuationSnapshot.findMany({
            where: {
              companyId,
              createdAt: { gt: sinceDate },
            },
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { snapshotReason: true, createdAt: true },
          })
          for (const snap of newSnapshots) {
            const label = getAnnotationLabel(snap.snapshotReason)
            if (label) {
              events.push({ type: 'valuation', message: label, date: snap.createdAt.toISOString() })
            }
          }

          // Drift alerts since last visit
          const driftSignals = await prisma.signal.findMany({
            where: {
              companyId,
              eventType: 'DRIFT_DETECTED',
              createdAt: { gt: sinceDate },
            },
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { title: true, createdAt: true },
          })
          for (const s of driftSignals) {
            events.push({ type: 'drift', message: s.title, date: s.createdAt.toISOString() })
          }

          // Sort by date desc, limit to 3
          events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          return events.slice(0, 3)
        } catch {
          return []
        }
      })(),
      lastVisitAt: await (async () => {
        try {
          const userId = (result as AuthSuccess).auth.user.id
          const lastSession = await prisma.userSession.findFirst({
            where: { userId, revokedAt: null },
            orderBy: { lastActiveAt: 'desc' },
            select: { lastActiveAt: true },
          })
          return lastSession?.lastActiveAt?.toISOString() ?? null
        } catch {
          return null
        }
      })(),
      // Re-assessment trigger data
      lastAssessmentDate,
      tasksCompletedSinceAssessment,
      criticalTasksTotal,
      criticalTasksCompleted,
      significantTasksCompleted,
      // Email verification status
      emailVerified: await (async () => {
        try {
          const userId = (result as AuthSuccess).auth.user.id
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true },
          })
          return user?.emailVerified ?? false
        } catch {
          return false
        }
      })(),
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
