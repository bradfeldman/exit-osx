import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { calculateEbitda } from '@/lib/financial-calculations'

interface FinancialMetric {
  label: string
  value: number | null
  unit: 'percent' | 'ratio' | 'days' | 'times'
  benchmark?: { low: number; high: number }
  description: string
  trend?: number
}

interface MetricCategory {
  name: string
  icon: string
  color: string
  metrics: FinancialMetric[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID required' }, { status: 400 })
    }

    // Fetch the current period with financial data
    const currentPeriod = await prisma.financialPeriod.findUnique({
      where: { id: periodId, companyId },
      include: {
        incomeStatement: true,
        balanceSheet: true,
        cashFlowStatement: true,
      },
    })

    if (!currentPeriod) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // Try to fetch prior period for trend calculation
    const priorPeriod = await prisma.financialPeriod.findFirst({
      where: {
        companyId,
        fiscalYear: currentPeriod.fiscalYear - 1,
      },
      include: {
        incomeStatement: true,
        balanceSheet: true,
      },
    })

    const is = currentPeriod.incomeStatement
    const bs = currentPeriod.balanceSheet
    const priorIs = priorPeriod?.incomeStatement
    const _priorBs = priorPeriod?.balanceSheet

    // Calculate metrics using shared EBITDA formula (PROD-010 fix)
    const grossRevenue = is ? Number(is.grossRevenue) : null
    const cogs = is ? Number(is.cogs) : null
    const operatingExpenses = is ? Number(is.operatingExpenses) : null
    const grossProfit = grossRevenue !== null && cogs !== null ? grossRevenue - cogs : null
    const depreciation = is?.depreciation ? Number(is.depreciation) : 0
    const amortization = is?.amortization ? Number(is.amortization) : 0
    const interestExpense = is?.interestExpense ? Number(is.interestExpense) : 0
    const taxExpense = is?.taxExpense ? Number(is.taxExpense) : 0
    // EBITDA = Gross Profit - Operating Expenses + D + A + I + T
    // Previous bug: was using grossProfit - operatingExpenses (missing D, A, I, T add-backs)
    const ebitda = grossProfit !== null && operatingExpenses !== null
      ? calculateEbitda({
          grossProfit,
          operatingExpenses,
          depreciation,
          amortization,
          interestExpense,
          taxExpense,
        })
      : null
    const netIncome = ebitda !== null ? ebitda - depreciation - amortization - interestExpense - taxExpense : null

    // Prior period for trends (PROD-010: use consistent EBITDA formula)
    const priorGrossRevenue = priorIs ? Number(priorIs.grossRevenue) : null
    const priorCogs = priorIs ? Number(priorIs.cogs) : null
    const priorGrossProfit = priorGrossRevenue !== null && priorCogs !== null ? priorGrossRevenue - priorCogs : null
    const priorOperatingExpenses = priorIs ? Number(priorIs.operatingExpenses) : null
    const priorDepreciation = priorIs?.depreciation ? Number(priorIs.depreciation) : 0
    const priorAmortization = priorIs?.amortization ? Number(priorIs.amortization) : 0
    const priorInterestExpense = priorIs?.interestExpense ? Number(priorIs.interestExpense) : 0
    const priorTaxExpense = priorIs?.taxExpense ? Number(priorIs.taxExpense) : 0
    const priorEbitda = priorGrossProfit !== null && priorOperatingExpenses !== null
      ? calculateEbitda({
          grossProfit: priorGrossProfit,
          operatingExpenses: priorOperatingExpenses,
          depreciation: priorDepreciation,
          amortization: priorAmortization,
          interestExpense: priorInterestExpense,
          taxExpense: priorTaxExpense,
        })
      : null

    // Balance sheet values
    const totalCurrentAssets = bs ? Number(bs.totalCurrentAssets) : null
    const totalCurrentLiabilities = bs ? Number(bs.totalCurrentLiabilities) : null
    const cash = bs ? Number(bs.cash) : null
    const inventory = bs ? Number(bs.inventory) : null
    const accountsReceivable = bs ? Number(bs.accountsReceivable) : null
    const accountsPayable = bs ? Number(bs.accountsPayable) : null
    const totalAssets = bs ? Number(bs.totalAssets) : null
    const _totalLiabilities = bs ? Number(bs.totalLiabilities) : null
    const longTermDebt = bs ? Number(bs.longTermDebt) : null
    const currentPortionLtd = bs ? Number(bs.currentPortionLtd) : null
    const ownersEquity = bs ? Number(bs.ownersEquity) : null
    const retainedEarnings = bs ? Number(bs.retainedEarnings) : null
    const totalEquity = ownersEquity !== null && retainedEarnings !== null
      ? ownersEquity + retainedEarnings
      : null
    const totalDebt = (longTermDebt || 0) + (currentPortionLtd || 0)

    // Calculate ratios
    // Profitability
    const grossMargin = grossRevenue && grossProfit ? (grossProfit / grossRevenue) * 100 : null
    const ebitdaMargin = grossRevenue && ebitda ? (ebitda / grossRevenue) * 100 : null
    const netMargin = grossRevenue && netIncome ? (netIncome / grossRevenue) * 100 : null

    // Prior margins for trends
    const priorGrossMargin = priorGrossRevenue && priorGrossProfit ? (priorGrossProfit / priorGrossRevenue) * 100 : null
    const priorEbitdaMargin = priorGrossRevenue && priorEbitda ? (priorEbitda / priorGrossRevenue) * 100 : null

    // Liquidity
    const currentRatio = totalCurrentAssets && totalCurrentLiabilities
      ? totalCurrentAssets / totalCurrentLiabilities
      : null
    const quickAssets = totalCurrentAssets && inventory
      ? totalCurrentAssets - inventory
      : totalCurrentAssets
    const quickRatio = quickAssets && totalCurrentLiabilities
      ? quickAssets / totalCurrentLiabilities
      : null
    const cashRatio = cash && totalCurrentLiabilities
      ? cash / totalCurrentLiabilities
      : null

    // Leverage
    const debtToEquity = totalEquity && totalEquity > 0
      ? totalDebt / totalEquity
      : null
    const interestCoverage = ebitda && interestExpense > 0
      ? ebitda / interestExpense
      : ebitda && interestExpense === 0 ? 999 : null // Infinite if no interest
    const debtToEbitda = ebitda && ebitda > 0
      ? totalDebt / ebitda
      : null

    // Efficiency (simplified - using annual values)
    const dso = accountsReceivable && grossRevenue
      ? (accountsReceivable / grossRevenue) * 365
      : null
    const dpo = accountsPayable && cogs
      ? (accountsPayable / cogs) * 365
      : null
    const assetTurnover = totalAssets && grossRevenue
      ? grossRevenue / totalAssets
      : null

    // Calculate health score (weighted average of normalized metrics)
    let healthScore: number | null = null
    const scores: number[] = []

    // Add scores for metrics that have values
    if (grossMargin !== null) scores.push(Math.min(100, (grossMargin / 50) * 100))
    if (ebitdaMargin !== null) scores.push(Math.min(100, (ebitdaMargin / 25) * 100))
    if (currentRatio !== null) scores.push(Math.min(100, (currentRatio / 2) * 100))
    if (debtToEquity !== null) scores.push(Math.max(0, 100 - (debtToEquity / 1.5) * 50))

    if (scores.length > 0) {
      healthScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    const categories: MetricCategory[] = [
      {
        name: 'Profitability',
        icon: 'trending-up',
        color: 'text-emerald-600',
        metrics: [
          {
            label: 'Gross Margin',
            value: grossMargin,
            unit: 'percent',
            benchmark: { low: 30, high: 50 },
            description: 'Revenue retained after direct costs',
            trend: priorGrossMargin && grossMargin ? grossMargin - priorGrossMargin : undefined,
          },
          {
            label: 'EBITDA Margin',
            value: ebitdaMargin,
            unit: 'percent',
            benchmark: { low: 10, high: 25 },
            description: 'Operating profitability before D&A',
            trend: priorEbitdaMargin && ebitdaMargin ? ebitdaMargin - priorEbitdaMargin : undefined,
          },
          {
            label: 'Net Margin',
            value: netMargin,
            unit: 'percent',
            benchmark: { low: 5, high: 15 },
            description: 'Bottom-line profitability',
          },
        ],
      },
      {
        name: 'Liquidity',
        icon: 'droplets',
        color: 'text-blue-600',
        metrics: [
          {
            label: 'Current Ratio',
            value: currentRatio,
            unit: 'ratio',
            benchmark: { low: 1.2, high: 2.0 },
            description: 'Ability to pay short-term obligations',
          },
          {
            label: 'Quick Ratio',
            value: quickRatio,
            unit: 'ratio',
            benchmark: { low: 0.8, high: 1.5 },
            description: 'Liquid assets vs current liabilities',
          },
          {
            label: 'Cash Ratio',
            value: cashRatio,
            unit: 'ratio',
            benchmark: { low: 0.2, high: 0.5 },
            description: 'Cash-only coverage of liabilities',
          },
        ],
      },
      {
        name: 'Leverage',
        icon: 'scale',
        color: 'text-purple-600',
        metrics: [
          {
            label: 'Debt-to-Equity',
            value: debtToEquity,
            unit: 'ratio',
            benchmark: { low: 0, high: 1.5 },
            description: 'Total debt relative to equity',
          },
          {
            label: 'Interest Coverage',
            value: interestCoverage === 999 ? null : interestCoverage,
            unit: 'times',
            benchmark: { low: 3, high: 10 },
            description: 'Ability to service debt interest',
          },
          {
            label: 'Debt-to-EBITDA',
            value: debtToEbitda,
            unit: 'times',
            benchmark: { low: 0, high: 3 },
            description: 'Debt relative to cash flow',
          },
        ],
      },
      {
        name: 'Efficiency',
        icon: 'zap',
        color: 'text-orange-600',
        metrics: [
          {
            label: 'DSO',
            value: dso,
            unit: 'days',
            benchmark: { low: 30, high: 45 },
            description: 'Days to collect receivables',
          },
          {
            label: 'DPO',
            value: dpo,
            unit: 'days',
            benchmark: { low: 30, high: 60 },
            description: 'Days to pay suppliers',
          },
          {
            label: 'Asset Turnover',
            value: assetTurnover,
            unit: 'times',
            benchmark: { low: 0.5, high: 2.0 },
            description: 'Revenue per dollar of assets',
          },
        ],
      },
    ]

    return NextResponse.json({
      healthScore,
      categories,
      period: {
        id: currentPeriod.id,
        fiscalYear: currentPeriod.fiscalYear,
      },
    })
  } catch (error) {
    console.error('Error fetching financial profile:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch financial profile' },
      { status: 500 }
    )
  }
}
