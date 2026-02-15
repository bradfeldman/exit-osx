import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PeriodType } from '@prisma/client'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import {
  calculateFreeCashFlow,
  calculateNetIncomeFromEbitda,
} from '@/lib/financial-calculations'
import { validateRequestBody, cashFlowSchema } from '@/lib/security/validation'

// Calculate cash flow statement from P&L and Balance Sheet data
function calculateCashFlowStatement(
  currentPeriod: {
    incomeStatement: {
      ebitda: number
      depreciation: number | null
      amortization: number | null
      interestExpense: number | null
      taxExpense: number | null
    } | null
    balanceSheet: {
      cash: number
      accountsReceivable: number
      inventory: number
      prepaidExpenses: number
      otherCurrentAssets: number
      ppeGross: number
      accumulatedDepreciation: number
      intangibleAssets: number
      otherLongTermAssets: number
      accountsPayable: number
      accruedExpenses: number
      currentPortionLtd: number
      otherCurrentLiabilities: number
      longTermDebt: number
      deferredTaxLiabilities: number
      otherLongTermLiabilities: number
      ownersEquity: number
    } | null
  },
  priorPeriod: {
    balanceSheet: {
      cash: number
      accountsReceivable: number
      inventory: number
      prepaidExpenses: number
      otherCurrentAssets: number
      ppeGross: number
      accumulatedDepreciation: number
      intangibleAssets: number
      otherLongTermAssets: number
      accountsPayable: number
      accruedExpenses: number
      currentPortionLtd: number
      otherCurrentLiabilities: number
      longTermDebt: number
      deferredTaxLiabilities: number
      otherLongTermLiabilities: number
      ownersEquity: number
    } | null
  } | null
) {
  if (!currentPeriod.incomeStatement || !currentPeriod.balanceSheet || !priorPeriod?.balanceSheet) {
    return null
  }

  const is = currentPeriod.incomeStatement
  const bs = currentPeriod.balanceSheet
  const pbs = priorPeriod.balanceSheet

  // Calculate Net Income from EBITDA using shared utility (PROD-010)
  const depreciation = is.depreciation || 0
  const amortization = is.amortization || 0
  const interestExpense = is.interestExpense || 0
  const taxExpense = is.taxExpense || 0
  const netIncome = calculateNetIncomeFromEbitda({
    ebitda: is.ebitda,
    depreciation,
    amortization,
    interestExpense,
    taxExpense,
  })

  // Operating Activities (Indirect Method)
  // Changes in working capital (increase in assets = cash outflow, increase in liabilities = cash inflow)
  const changeInAccountsReceivable = pbs.accountsReceivable - bs.accountsReceivable // Decrease = inflow
  const changeInInventory = pbs.inventory - bs.inventory // Decrease = inflow
  const changeInPrepaidExpenses = pbs.prepaidExpenses - bs.prepaidExpenses // Decrease = inflow
  const changeInOtherCurrentAssets = pbs.otherCurrentAssets - bs.otherCurrentAssets // Decrease = inflow
  const changeInAccountsPayable = bs.accountsPayable - pbs.accountsPayable // Increase = inflow
  const changeInAccruedExpenses = bs.accruedExpenses - pbs.accruedExpenses // Increase = inflow
  const changeInOtherCurrentLiabilities = bs.otherCurrentLiabilities - pbs.otherCurrentLiabilities // Increase = inflow
  const changeInDeferredTaxLiabilities = bs.deferredTaxLiabilities - pbs.deferredTaxLiabilities // Increase = inflow

  const cashFromOperations = netIncome + depreciation + amortization +
    changeInAccountsReceivable + changeInInventory + changeInPrepaidExpenses + changeInOtherCurrentAssets +
    changeInAccountsPayable + changeInAccruedExpenses + changeInOtherCurrentLiabilities + changeInDeferredTaxLiabilities

  // Investing Activities
  // CapEx = Increase in PP&E Gross (negative = outflow)
  const capitalExpenditures = -(bs.ppeGross - pbs.ppeGross)
  const changeInIntangibleAssets = -(bs.intangibleAssets - pbs.intangibleAssets)
  const changeInOtherLongTermAssets = -(bs.otherLongTermAssets - pbs.otherLongTermAssets)
  const cashFromInvesting = capitalExpenditures + changeInIntangibleAssets + changeInOtherLongTermAssets

  // Financing Activities
  const changeInCurrentPortionLtd = bs.currentPortionLtd - pbs.currentPortionLtd
  const changeInLongTermDebt = bs.longTermDebt - pbs.longTermDebt
  const changeInOtherLongTermLiabilities = bs.otherLongTermLiabilities - pbs.otherLongTermLiabilities
  const changeInOwnersEquity = bs.ownersEquity - pbs.ownersEquity
  const cashFromFinancing = changeInCurrentPortionLtd + changeInLongTermDebt + changeInOtherLongTermLiabilities + changeInOwnersEquity

  // Summary
  const netChangeInCash = cashFromOperations + cashFromInvesting + cashFromFinancing
  const beginningCash = pbs.cash
  const endingCash = bs.cash

  // Free Cash Flow = Cash from Operations + CapEx (PROD-010 fix)
  // capitalExpenditures is already signed: negative for purchases (outflows)
  // Previous bug: Math.abs(capitalExpenditures) would double-negate when capex was
  // already negative, and incorrectly subtract when capex was positive (asset sales)
  const freeCashFlow = calculateFreeCashFlow(cashFromOperations, capitalExpenditures)

  return {
    netIncome,
    depreciation,
    amortization,
    changeInAccountsReceivable,
    changeInInventory,
    changeInPrepaidExpenses,
    changeInOtherCurrentAssets,
    changeInAccountsPayable,
    changeInAccruedExpenses,
    changeInOtherCurrentLiabilities,
    changeInDeferredTaxLiabilities,
    otherOperatingAdjustments: 0,
    cashFromOperations,
    capitalExpenditures,
    changeInIntangibleAssets,
    changeInOtherLongTermAssets,
    otherInvestingActivities: 0,
    cashFromInvesting,
    changeInCurrentPortionLtd,
    changeInLongTermDebt,
    changeInOtherLongTermLiabilities,
    changeInOwnersEquity,
    otherFinancingActivities: 0,
    cashFromFinancing,
    netChangeInCash,
    beginningCash,
    endingCash,
    freeCashFlow,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; periodId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId, periodId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the current period with its statements
    const currentPeriod = await prisma.financialPeriod.findUnique({
      where: { id: periodId },
      include: {
        incomeStatement: true,
        balanceSheet: true,
        cashFlowStatement: true,
      }
    })

    if (!currentPeriod || currentPeriod.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // If we already have a cash flow statement, return it
    if (currentPeriod.cashFlowStatement) {
      const cfs = currentPeriod.cashFlowStatement
      return NextResponse.json({
        cashFlowStatement: {
          id: cfs.id,
          periodId: cfs.periodId,
          priorPeriodId: cfs.priorPeriodId,
          // Operating Activities
          netIncome: Number(cfs.netIncome),
          depreciation: Number(cfs.depreciation),
          amortization: Number(cfs.amortization),
          changeInAccountsReceivable: Number(cfs.changeInAccountsReceivable),
          changeInInventory: Number(cfs.changeInInventory),
          changeInPrepaidExpenses: Number(cfs.changeInPrepaidExpenses),
          changeInOtherCurrentAssets: Number(cfs.changeInOtherCurrentAssets),
          changeInAccountsPayable: Number(cfs.changeInAccountsPayable),
          changeInAccruedExpenses: Number(cfs.changeInAccruedExpenses),
          changeInOtherCurrentLiabilities: Number(cfs.changeInOtherCurrentLiabilities),
          changeInDeferredTaxLiabilities: Number(cfs.changeInDeferredTaxLiabilities),
          otherOperatingAdjustments: Number(cfs.otherOperatingAdjustments),
          cashFromOperations: Number(cfs.cashFromOperations),
          // Investing Activities
          capitalExpenditures: Number(cfs.capitalExpenditures),
          changeInIntangibleAssets: Number(cfs.changeInIntangibleAssets),
          changeInOtherLongTermAssets: Number(cfs.changeInOtherLongTermAssets),
          otherInvestingActivities: Number(cfs.otherInvestingActivities),
          cashFromInvesting: Number(cfs.cashFromInvesting),
          // Financing Activities
          changeInCurrentPortionLtd: Number(cfs.changeInCurrentPortionLtd),
          changeInLongTermDebt: Number(cfs.changeInLongTermDebt),
          changeInOtherLongTermLiabilities: Number(cfs.changeInOtherLongTermLiabilities),
          changeInOwnersEquity: Number(cfs.changeInOwnersEquity),
          otherFinancingActivities: Number(cfs.otherFinancingActivities),
          cashFromFinancing: Number(cfs.cashFromFinancing),
          // Summary
          netChangeInCash: Number(cfs.netChangeInCash),
          beginningCash: Number(cfs.beginningCash),
          endingCash: Number(cfs.endingCash),
          freeCashFlow: Number(cfs.freeCashFlow),
          createdAt: cfs.createdAt.toISOString(),
          updatedAt: cfs.updatedAt.toISOString(),
        },
        canCalculate: true,
        calculated: false,
      })
    }

    // Try to calculate from P&L and Balance Sheet
    // Find prior year period
    const priorPeriod = await prisma.financialPeriod.findFirst({
      where: {
        companyId,
        periodType: PeriodType.ANNUAL,
        fiscalYear: currentPeriod.fiscalYear - 1,
      },
      include: {
        balanceSheet: true,
      }
    })

    // Check if we can calculate
    const canCalculate = !!(
      currentPeriod.incomeStatement &&
      currentPeriod.balanceSheet &&
      priorPeriod?.balanceSheet
    )

    if (!canCalculate) {
      return NextResponse.json({
        cashFlowStatement: null,
        canCalculate: false,
        missingData: {
          currentPL: !currentPeriod.incomeStatement,
          currentBS: !currentPeriod.balanceSheet,
          priorBS: !priorPeriod?.balanceSheet,
          priorYear: currentPeriod.fiscalYear - 1,
        }
      })
    }

    // Calculate cash flow statement
    const calculated = calculateCashFlowStatement(
      {
        incomeStatement: {
          ebitda: Number(currentPeriod.incomeStatement!.ebitda),
          depreciation: currentPeriod.incomeStatement!.depreciation ? Number(currentPeriod.incomeStatement!.depreciation) : null,
          amortization: currentPeriod.incomeStatement!.amortization ? Number(currentPeriod.incomeStatement!.amortization) : null,
          interestExpense: currentPeriod.incomeStatement!.interestExpense ? Number(currentPeriod.incomeStatement!.interestExpense) : null,
          taxExpense: currentPeriod.incomeStatement!.taxExpense ? Number(currentPeriod.incomeStatement!.taxExpense) : null,
        },
        balanceSheet: {
          cash: Number(currentPeriod.balanceSheet!.cash),
          accountsReceivable: Number(currentPeriod.balanceSheet!.accountsReceivable),
          inventory: Number(currentPeriod.balanceSheet!.inventory),
          prepaidExpenses: Number(currentPeriod.balanceSheet!.prepaidExpenses),
          otherCurrentAssets: Number(currentPeriod.balanceSheet!.otherCurrentAssets),
          ppeGross: Number(currentPeriod.balanceSheet!.ppeGross),
          accumulatedDepreciation: Number(currentPeriod.balanceSheet!.accumulatedDepreciation),
          intangibleAssets: Number(currentPeriod.balanceSheet!.intangibleAssets),
          otherLongTermAssets: Number(currentPeriod.balanceSheet!.otherLongTermAssets),
          accountsPayable: Number(currentPeriod.balanceSheet!.accountsPayable),
          accruedExpenses: Number(currentPeriod.balanceSheet!.accruedExpenses),
          currentPortionLtd: Number(currentPeriod.balanceSheet!.currentPortionLtd),
          otherCurrentLiabilities: Number(currentPeriod.balanceSheet!.otherCurrentLiabilities),
          longTermDebt: Number(currentPeriod.balanceSheet!.longTermDebt),
          deferredTaxLiabilities: Number(currentPeriod.balanceSheet!.deferredTaxLiabilities),
          otherLongTermLiabilities: Number(currentPeriod.balanceSheet!.otherLongTermLiabilities),
          ownersEquity: Number(currentPeriod.balanceSheet!.ownersEquity),
        },
      },
      {
        balanceSheet: {
          cash: Number(priorPeriod!.balanceSheet!.cash),
          accountsReceivable: Number(priorPeriod!.balanceSheet!.accountsReceivable),
          inventory: Number(priorPeriod!.balanceSheet!.inventory),
          prepaidExpenses: Number(priorPeriod!.balanceSheet!.prepaidExpenses),
          otherCurrentAssets: Number(priorPeriod!.balanceSheet!.otherCurrentAssets),
          ppeGross: Number(priorPeriod!.balanceSheet!.ppeGross),
          accumulatedDepreciation: Number(priorPeriod!.balanceSheet!.accumulatedDepreciation),
          intangibleAssets: Number(priorPeriod!.balanceSheet!.intangibleAssets),
          otherLongTermAssets: Number(priorPeriod!.balanceSheet!.otherLongTermAssets),
          accountsPayable: Number(priorPeriod!.balanceSheet!.accountsPayable),
          accruedExpenses: Number(priorPeriod!.balanceSheet!.accruedExpenses),
          currentPortionLtd: Number(priorPeriod!.balanceSheet!.currentPortionLtd),
          otherCurrentLiabilities: Number(priorPeriod!.balanceSheet!.otherCurrentLiabilities),
          longTermDebt: Number(priorPeriod!.balanceSheet!.longTermDebt),
          deferredTaxLiabilities: Number(priorPeriod!.balanceSheet!.deferredTaxLiabilities),
          otherLongTermLiabilities: Number(priorPeriod!.balanceSheet!.otherLongTermLiabilities),
          ownersEquity: Number(priorPeriod!.balanceSheet!.ownersEquity),
        },
      }
    )

    return NextResponse.json({
      cashFlowStatement: calculated ? {
        ...calculated,
        periodId,
        priorPeriodId: priorPeriod!.id,
      } : null,
      canCalculate: true,
      calculated: true,
      priorPeriodId: priorPeriod!.id,
    })
  } catch (error) {
    console.error('Error fetching cash flow statement:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch cash flow statement' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; periodId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId, periodId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const validation = await validateRequestBody(request, cashFlowSchema)
    if (!validation.success) return validation.error

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify period belongs to company
    const period = await prisma.financialPeriod.findUnique({
      where: { id: periodId }
    })

    if (!period || period.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const {
      priorPeriodId,
      netIncome,
      depreciation,
      amortization,
      changeInAccountsReceivable,
      changeInInventory,
      changeInPrepaidExpenses,
      changeInOtherCurrentAssets,
      changeInAccountsPayable,
      changeInAccruedExpenses,
      changeInOtherCurrentLiabilities,
      changeInDeferredTaxLiabilities,
      otherOperatingAdjustments,
      capitalExpenditures,
      changeInIntangibleAssets,
      changeInOtherLongTermAssets,
      otherInvestingActivities,
      changeInCurrentPortionLtd,
      changeInLongTermDebt,
      changeInOtherLongTermLiabilities,
      changeInOwnersEquity,
      otherFinancingActivities,
      beginningCash,
      endingCash,
    } = validation.data

    // Calculate totals
    const cashFromOperations = netIncome + depreciation + amortization +
      changeInAccountsReceivable + changeInInventory + changeInPrepaidExpenses + changeInOtherCurrentAssets +
      changeInAccountsPayable + changeInAccruedExpenses + changeInOtherCurrentLiabilities + changeInDeferredTaxLiabilities +
      otherOperatingAdjustments

    const cashFromInvesting = capitalExpenditures + changeInIntangibleAssets + changeInOtherLongTermAssets + otherInvestingActivities

    const cashFromFinancing = changeInCurrentPortionLtd + changeInLongTermDebt + changeInOtherLongTermLiabilities +
      changeInOwnersEquity + otherFinancingActivities

    const netChangeInCash = cashFromOperations + cashFromInvesting + cashFromFinancing

    // Free Cash Flow = CFO + CapEx (PROD-010 fix: CapEx is already signed)
    // When user provides CapEx as a negative number, adding it to CFO is correct.
    // When user provides CapEx as a positive number (asset sale), it increases FCF.
    const freeCashFlow = calculateFreeCashFlow(cashFromOperations, capitalExpenditures)

    // Upsert cash flow statement
    const cfs = await prisma.cashFlowStatement.upsert({
      where: { periodId },
      create: {
        periodId,
        priorPeriodId,
        netIncome,
        depreciation,
        amortization,
        changeInAccountsReceivable,
        changeInInventory,
        changeInPrepaidExpenses,
        changeInOtherCurrentAssets,
        changeInAccountsPayable,
        changeInAccruedExpenses,
        changeInOtherCurrentLiabilities,
        changeInDeferredTaxLiabilities,
        otherOperatingAdjustments,
        cashFromOperations,
        capitalExpenditures,
        changeInIntangibleAssets,
        changeInOtherLongTermAssets,
        otherInvestingActivities,
        cashFromInvesting,
        changeInCurrentPortionLtd,
        changeInLongTermDebt,
        changeInOtherLongTermLiabilities,
        changeInOwnersEquity,
        otherFinancingActivities,
        cashFromFinancing,
        netChangeInCash,
        beginningCash,
        endingCash,
        freeCashFlow,
      },
      update: {
        priorPeriodId,
        netIncome,
        depreciation,
        amortization,
        changeInAccountsReceivable,
        changeInInventory,
        changeInPrepaidExpenses,
        changeInOtherCurrentAssets,
        changeInAccountsPayable,
        changeInAccruedExpenses,
        changeInOtherCurrentLiabilities,
        changeInDeferredTaxLiabilities,
        otherOperatingAdjustments,
        cashFromOperations,
        capitalExpenditures,
        changeInIntangibleAssets,
        changeInOtherLongTermAssets,
        otherInvestingActivities,
        cashFromInvesting,
        changeInCurrentPortionLtd,
        changeInLongTermDebt,
        changeInOtherLongTermLiabilities,
        changeInOwnersEquity,
        otherFinancingActivities,
        cashFromFinancing,
        netChangeInCash,
        beginningCash,
        endingCash,
        freeCashFlow,
      }
    })

    // Trigger snapshot recalculation (includes auto-DCF)
    try {
      await recalculateSnapshotForCompany(companyId, 'Cash flow data updated')
    } catch (err) {
      console.error('Error recalculating snapshot after cash flow save:', err)
      // Non-fatal: cash flow was saved successfully
    }

    return NextResponse.json({
      cashFlowStatement: {
        id: cfs.id,
        periodId: cfs.periodId,
        priorPeriodId: cfs.priorPeriodId,
        netIncome: Number(cfs.netIncome),
        depreciation: Number(cfs.depreciation),
        amortization: Number(cfs.amortization),
        changeInAccountsReceivable: Number(cfs.changeInAccountsReceivable),
        changeInInventory: Number(cfs.changeInInventory),
        changeInPrepaidExpenses: Number(cfs.changeInPrepaidExpenses),
        changeInOtherCurrentAssets: Number(cfs.changeInOtherCurrentAssets),
        changeInAccountsPayable: Number(cfs.changeInAccountsPayable),
        changeInAccruedExpenses: Number(cfs.changeInAccruedExpenses),
        changeInOtherCurrentLiabilities: Number(cfs.changeInOtherCurrentLiabilities),
        changeInDeferredTaxLiabilities: Number(cfs.changeInDeferredTaxLiabilities),
        otherOperatingAdjustments: Number(cfs.otherOperatingAdjustments),
        cashFromOperations: Number(cfs.cashFromOperations),
        capitalExpenditures: Number(cfs.capitalExpenditures),
        changeInIntangibleAssets: Number(cfs.changeInIntangibleAssets),
        changeInOtherLongTermAssets: Number(cfs.changeInOtherLongTermAssets),
        otherInvestingActivities: Number(cfs.otherInvestingActivities),
        cashFromInvesting: Number(cfs.cashFromInvesting),
        changeInCurrentPortionLtd: Number(cfs.changeInCurrentPortionLtd),
        changeInLongTermDebt: Number(cfs.changeInLongTermDebt),
        changeInOtherLongTermLiabilities: Number(cfs.changeInOtherLongTermLiabilities),
        changeInOwnersEquity: Number(cfs.changeInOwnersEquity),
        otherFinancingActivities: Number(cfs.otherFinancingActivities),
        cashFromFinancing: Number(cfs.cashFromFinancing),
        netChangeInCash: Number(cfs.netChangeInCash),
        beginningCash: Number(cfs.beginningCash),
        endingCash: Number(cfs.endingCash),
        freeCashFlow: Number(cfs.freeCashFlow),
        createdAt: cfs.createdAt.toISOString(),
        updatedAt: cfs.updatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error saving cash flow statement:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to save cash flow statement' },
      { status: 500 }
    )
  }
}
