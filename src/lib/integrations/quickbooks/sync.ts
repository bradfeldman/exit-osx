import { prisma } from '@/lib/prisma'
import { PeriodType, SyncStatus } from '@prisma/client'
import {
  getProfitAndLossReport,
  getBalanceSheetReport,
  parseProfitAndLossReport,
  parseBalanceSheetReport,
  getCompanyInfo,
} from './api'
import {
  calculateEbitda,
  calculateEbitdaMargin,
  calculateWorkingCapital,
} from '@/lib/financial-calculations'

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

        // Parse reports
        const plData = parseProfitAndLossReport(plReport)
        const bsData = parseBalanceSheetReport(bsReport)

        // Skip if no revenue (likely future year with no data)
        if (plData.grossRevenue === 0) {
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

        // Calculate derived P&L values using shared utility (PROD-010 fix)
        // NOTE: In QuickBooks, plData.depreciation includes both depreciation AND amortization
        // (see api.ts line 248). Amortization is passed as 0 here since it's combined.
        const grossMarginPct = plData.grossRevenue > 0
          ? plData.grossProfit / plData.grossRevenue
          : 0
        const ebitda = calculateEbitda({
          grossProfit: plData.grossProfit,
          operatingExpenses: plData.operatingExpenses,
          depreciation: plData.depreciation,  // Includes amortization from QB
          amortization: 0,                     // Combined into depreciation by QB parser
          interestExpense: plData.interestExpense,
          taxExpense: plData.taxExpense,
        })
        const ebitdaMarginPct = calculateEbitdaMargin(ebitda, plData.grossRevenue)

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

        // Operating Working Capital = AR + Inventory - AP (shared utility, PROD-010)
        const workingCapital = calculateWorkingCapital({
          accountsReceivable: bsData.accountsReceivable,
          inventory: bsData.inventory,
          accountsPayable: bsData.accountsPayable,
        })

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
        // SECURITY FIX (PROD-091 #6): Do not log the full error object, which may
        // contain QuickBooks API response bodies with financial data (revenue, expenses,
        // balance sheet figures). Only log the error message string.
        const yearErrorMessage = yearError instanceof Error ? yearError.message : 'Unknown error'
        console.error(`[QuickBooks] Error syncing year ${year}: ${yearErrorMessage}`)
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
