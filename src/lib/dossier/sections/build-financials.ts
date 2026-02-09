import { prisma } from '@/lib/prisma'
import type { FinancialsSection } from '../types'

export async function buildFinancialsSection(companyId: string): Promise<FinancialsSection> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
  })

  const periods = await prisma.financialPeriod.findMany({
    where: { companyId },
    include: {
      incomeStatement: true,
      balanceSheet: true,
    },
    orderBy: { endDate: 'desc' },
  })

  let revenueGrowthYoY: number | null = null
  let ebitdaMarginPct: number | null = null
  let latestPeriodLabel: string | null = null
  let balanceSheetHighlights: FinancialsSection['balanceSheetHighlights'] = null

  const latestPeriod = periods[0]
  const previousPeriod = periods[1]

  if (latestPeriod?.incomeStatement) {
    const stmt = latestPeriod.incomeStatement
    ebitdaMarginPct = Number(stmt.ebitdaMarginPct)
    latestPeriodLabel = latestPeriod.label || `FY${latestPeriod.fiscalYear}`

    if (previousPeriod?.incomeStatement) {
      const prevRevenue = Number(previousPeriod.incomeStatement.grossRevenue)
      const currRevenue = Number(stmt.grossRevenue)
      if (prevRevenue > 0) {
        revenueGrowthYoY = (currRevenue - prevRevenue) / prevRevenue
      }
    }
  }

  if (latestPeriod?.balanceSheet) {
    const bs = latestPeriod.balanceSheet
    balanceSheetHighlights = {
      totalAssets: Number(bs.totalAssets),
      totalLiabilities: Number(bs.totalLiabilities),
      workingCapital: Number(bs.workingCapital),
      cash: Number(bs.cash),
    }
  }

  // Determine data completeness
  let dataCompleteness: FinancialsSection['dataCompleteness'] = 'none'
  const periodsWithIncome = periods.filter(p => p.incomeStatement).length
  const periodsWithBalance = periods.filter(p => p.balanceSheet).length

  if (periodsWithIncome >= 3 && periodsWithBalance >= 1) {
    dataCompleteness = 'complete'
  } else if (periodsWithIncome >= 2) {
    dataCompleteness = 'partial'
  } else if (periodsWithIncome >= 1) {
    dataCompleteness = 'minimal'
  }

  return {
    annualRevenue: Number(company.annualRevenue),
    annualEbitda: Number(company.annualEbitda),
    ownerCompensation: Number(company.ownerCompensation),
    revenueGrowthYoY,
    ebitdaMarginPct,
    periodsAvailable: periods.length,
    latestPeriodLabel,
    balanceSheetHighlights,
    dataCompleteness,
  }
}
