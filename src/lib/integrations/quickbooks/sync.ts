import { prisma } from '@/lib/prisma'
import { PeriodType, SyncStatus } from '@prisma/client'
import {
  getProfitAndLossReport,
  getBalanceSheetReport,
  parseProfitAndLossReport,
  parseBalanceSheetReport,
  getCompanyInfo,
} from './api'

interface SyncResult {
  success: boolean
  periodsCreated: number
  periodsUpdated: number
  error?: string
}

// Sync financial data from QuickBooks for a company
export async function syncQuickBooksData(
  integrationId: string,
  syncType: 'manual' | 'auto' | 'initial' = 'manual'
): Promise<SyncResult> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: { company: true },
  })

  if (!integration) {
    return { success: false, periodsCreated: 0, periodsUpdated: 0, error: 'Integration not found' }
  }

  // Create sync log
  const syncLog = await prisma.integrationSyncLog.create({
    data: {
      integrationId,
      syncType,
      status: SyncStatus.SYNCING,
    },
  })

  // Update integration status
  await prisma.integration.update({
    where: { id: integrationId },
    data: { lastSyncStatus: SyncStatus.SYNCING },
  })

  try {
    // Get company info for fiscal year
    const companyInfo = await getCompanyInfo(integrationId)

    // Update provider company name if not set
    if (!integration.providerCompanyName) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: { providerCompanyName: companyInfo.companyName },
      })
    }

    // Determine periods to sync (last 6 years of annual data for comprehensive history)
    const currentYear = new Date().getFullYear()
    const yearsToSync = [currentYear - 5, currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear]

    let periodsCreated = 0
    let periodsUpdated = 0

    for (const year of yearsToSync) {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      try {
        // Fetch reports from QuickBooks
        const [plReport, bsReport] = await Promise.all([
          getProfitAndLossReport(integrationId, startDate, endDate),
          getBalanceSheetReport(integrationId, endDate),
        ])

        // Debug: Log raw report structure
        console.log(`[QB Sync] Year ${year} - P&L Report rows:`, JSON.stringify(plReport.Rows?.Row?.slice(0, 3), null, 2))

        // Parse reports
        const plData = parseProfitAndLossReport(plReport)
        const bsData = parseBalanceSheetReport(bsReport)

        // Debug: Log parsed data
        console.log(`[QB Sync] Year ${year} - Parsed P&L:`, plData)

        // Skip if no revenue (likely future year with no data)
        if (plData.grossRevenue === 0) {
          console.log(`[QB Sync] Year ${year} - Skipping: grossRevenue is 0`)
          continue
        }

        // Find or create financial period
        let period = await prisma.financialPeriod.findFirst({
          where: {
            companyId: integration.companyId,
            fiscalYear: year,
            periodType: PeriodType.ANNUAL,
          },
          include: {
            incomeStatement: true,
            balanceSheet: true,
          },
        })

        const _isNew = !period

        if (!period) {
          period = await prisma.financialPeriod.create({
            data: {
              companyId: integration.companyId,
              periodType: PeriodType.ANNUAL,
              fiscalYear: year,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              label: `FY ${year}`,
            },
            include: {
              incomeStatement: true,
              balanceSheet: true,
            },
          })
          periodsCreated++
        } else {
          periodsUpdated++
        }

        // Calculate derived P&L values
        const grossMarginPct = plData.grossRevenue > 0
          ? plData.grossProfit / plData.grossRevenue
          : 0
        const ebitda = plData.grossProfit - plData.operatingExpenses + plData.depreciation
        const ebitdaMarginPct = plData.grossRevenue > 0 ? ebitda / plData.grossRevenue : 0

        // Upsert income statement
        if (period.incomeStatement) {
          await prisma.incomeStatement.update({
            where: { id: period.incomeStatement.id },
            data: {
              grossRevenue: plData.grossRevenue,
              cogs: plData.cogs,
              grossProfit: plData.grossProfit,
              grossMarginPct,
              operatingExpenses: plData.operatingExpenses,
              ebitda,
              ebitdaMarginPct,
              depreciation: plData.depreciation || null,
              interestExpense: plData.interestExpense || null,
              taxExpense: plData.taxExpense || null,
            },
          })
        } else {
          await prisma.incomeStatement.create({
            data: {
              periodId: period.id,
              grossRevenue: plData.grossRevenue,
              cogs: plData.cogs,
              grossProfit: plData.grossProfit,
              grossMarginPct,
              operatingExpenses: plData.operatingExpenses,
              ebitda,
              ebitdaMarginPct,
              depreciation: plData.depreciation || null,
              interestExpense: plData.interestExpense || null,
              taxExpense: plData.taxExpense || null,
            },
          })
        }

        // Calculate derived balance sheet values
        const totalCurrentAssets = bsData.totalCurrentAssets ||
          (bsData.cash + bsData.accountsReceivable + bsData.inventory +
           bsData.prepaidExpenses + bsData.otherCurrentAssets)

        const ppeNet = bsData.ppeGross - bsData.accumulatedDepreciation
        const totalLongTermAssets = bsData.totalLongTermAssets ||
          (ppeNet + bsData.intangibleAssets + bsData.otherLongTermAssets)

        const totalAssets = bsData.totalAssets || (totalCurrentAssets + totalLongTermAssets)

        const totalCurrentLiabilities = bsData.totalCurrentLiabilities ||
          (bsData.accountsPayable + bsData.accruedExpenses +
           bsData.currentPortionLtd + bsData.otherCurrentLiabilities)

        const totalLongTermLiabilities = bsData.totalLongTermLiabilities ||
          (bsData.longTermDebt + bsData.deferredTaxLiabilities + bsData.otherLongTermLiabilities)

        const totalLiabilities = bsData.totalLiabilities ||
          (totalCurrentLiabilities + totalLongTermLiabilities)

        const totalEquity = bsData.totalEquity ||
          (bsData.retainedEarnings + bsData.ownersEquity)

        // Operating Working Capital = AR + Inventory - AP
        const workingCapital = bsData.accountsReceivable + bsData.inventory - bsData.accountsPayable

        // Upsert balance sheet
        if (period.balanceSheet) {
          await prisma.balanceSheet.update({
            where: { id: period.balanceSheet.id },
            data: {
              cash: bsData.cash,
              accountsReceivable: bsData.accountsReceivable,
              inventory: bsData.inventory,
              prepaidExpenses: bsData.prepaidExpenses,
              otherCurrentAssets: bsData.otherCurrentAssets,
              ppeGross: bsData.ppeGross,
              accumulatedDepreciation: bsData.accumulatedDepreciation,
              intangibleAssets: bsData.intangibleAssets,
              otherLongTermAssets: bsData.otherLongTermAssets,
              accountsPayable: bsData.accountsPayable,
              accruedExpenses: bsData.accruedExpenses,
              currentPortionLtd: bsData.currentPortionLtd,
              otherCurrentLiabilities: bsData.otherCurrentLiabilities,
              longTermDebt: bsData.longTermDebt,
              deferredTaxLiabilities: bsData.deferredTaxLiabilities,
              otherLongTermLiabilities: bsData.otherLongTermLiabilities,
              retainedEarnings: bsData.retainedEarnings,
              ownersEquity: bsData.ownersEquity,
              totalCurrentAssets,
              totalLongTermAssets,
              totalAssets,
              totalCurrentLiabilities,
              totalLongTermLiabilities,
              totalLiabilities,
              totalEquity,
              workingCapital,
            },
          })
        } else {
          await prisma.balanceSheet.create({
            data: {
              periodId: period.id,
              cash: bsData.cash,
              accountsReceivable: bsData.accountsReceivable,
              inventory: bsData.inventory,
              prepaidExpenses: bsData.prepaidExpenses,
              otherCurrentAssets: bsData.otherCurrentAssets,
              ppeGross: bsData.ppeGross,
              accumulatedDepreciation: bsData.accumulatedDepreciation,
              intangibleAssets: bsData.intangibleAssets,
              otherLongTermAssets: bsData.otherLongTermAssets,
              accountsPayable: bsData.accountsPayable,
              accruedExpenses: bsData.accruedExpenses,
              currentPortionLtd: bsData.currentPortionLtd,
              otherCurrentLiabilities: bsData.otherCurrentLiabilities,
              longTermDebt: bsData.longTermDebt,
              deferredTaxLiabilities: bsData.deferredTaxLiabilities,
              otherLongTermLiabilities: bsData.otherLongTermLiabilities,
              retainedEarnings: bsData.retainedEarnings,
              ownersEquity: bsData.ownersEquity,
              totalCurrentAssets,
              totalLongTermAssets,
              totalAssets,
              totalCurrentLiabilities,
              totalLongTermLiabilities,
              totalLiabilities,
              totalEquity,
              workingCapital,
            },
          })
        }
      } catch (yearError) {
        console.error(`Error syncing year ${year}:`, yearError)
        // Continue with other years
      }
    }

    // Update sync status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: SyncStatus.SUCCESS,
        lastSyncError: null,
      },
    })

    // Update sync log
    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        periodsCreated,
        periodsUpdated,
      },
    })

    return { success: true, periodsCreated, periodsUpdated }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update sync status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncStatus: SyncStatus.FAILED,
        lastSyncError: errorMessage,
      },
    })

    // Update sync log
    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      },
    })

    return { success: false, periodsCreated: 0, periodsUpdated: 0, error: errorMessage }
  }
}
