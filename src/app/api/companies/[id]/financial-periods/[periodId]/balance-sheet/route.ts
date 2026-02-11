import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { triggerDossierUpdate } from '@/lib/dossier/build-dossier'
import { calculateWorkingCapital } from '@/lib/financial-calculations'

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
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify period belongs to company
    const period = await prisma.financialPeriod.findUnique({
      where: { id: periodId },
      include: { balanceSheet: true }
    })

    if (!period || period.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    if (!period.balanceSheet) {
      return NextResponse.json({ balanceSheet: null })
    }

    const bs = period.balanceSheet
    return NextResponse.json({
      balanceSheet: {
        id: bs.id,
        periodId: bs.periodId,
        // Current Assets
        cash: Number(bs.cash),
        accountsReceivable: Number(bs.accountsReceivable),
        inventory: Number(bs.inventory),
        prepaidExpenses: Number(bs.prepaidExpenses),
        otherCurrentAssets: Number(bs.otherCurrentAssets),
        // Long-term Assets
        ppeGross: Number(bs.ppeGross),
        accumulatedDepreciation: Number(bs.accumulatedDepreciation),
        intangibleAssets: Number(bs.intangibleAssets),
        otherLongTermAssets: Number(bs.otherLongTermAssets),
        // Current Liabilities
        accountsPayable: Number(bs.accountsPayable),
        accruedExpenses: Number(bs.accruedExpenses),
        currentPortionLtd: Number(bs.currentPortionLtd),
        otherCurrentLiabilities: Number(bs.otherCurrentLiabilities),
        // Long-term Liabilities
        longTermDebt: Number(bs.longTermDebt),
        deferredTaxLiabilities: Number(bs.deferredTaxLiabilities),
        otherLongTermLiabilities: Number(bs.otherLongTermLiabilities),
        // Equity
        retainedEarnings: Number(bs.retainedEarnings),
        ownersEquity: Number(bs.ownersEquity),
        // Calculated
        totalCurrentAssets: Number(bs.totalCurrentAssets),
        totalLongTermAssets: Number(bs.totalLongTermAssets),
        totalAssets: Number(bs.totalAssets),
        totalCurrentLiabilities: Number(bs.totalCurrentLiabilities),
        totalLongTermLiabilities: Number(bs.totalLongTermLiabilities),
        totalLiabilities: Number(bs.totalLiabilities),
        totalEquity: Number(bs.totalEquity),
        workingCapital: Number(bs.workingCapital),
        createdAt: bs.createdAt.toISOString(),
        updatedAt: bs.updatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching balance sheet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet' },
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
    const body = await request.json()
    const {
      // Current Assets
      cash = 0,
      accountsReceivable = 0,
      inventory = 0,
      prepaidExpenses = 0,
      otherCurrentAssets = 0,
      // Long-term Assets
      ppeGross = 0,
      accumulatedDepreciation = 0,
      intangibleAssets = 0,
      otherLongTermAssets = 0,
      // Current Liabilities
      accountsPayable = 0,
      accruedExpenses = 0,
      currentPortionLtd = 0,
      otherCurrentLiabilities = 0,
      // Long-term Liabilities
      longTermDebt = 0,
      deferredTaxLiabilities = 0,
      otherLongTermLiabilities = 0,
      // Equity
      retainedEarnings = 0,
      ownersEquity = 0,
    } = body

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify period belongs to company
    const period = await prisma.financialPeriod.findUnique({
      where: { id: periodId }
    })

    if (!period || period.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // Calculate derived fields
    const totalCurrentAssets = cash + accountsReceivable + inventory + prepaidExpenses + otherCurrentAssets
    const netPPE = ppeGross - accumulatedDepreciation
    const totalLongTermAssets = netPPE + intangibleAssets + otherLongTermAssets
    const totalAssets = totalCurrentAssets + totalLongTermAssets

    const totalCurrentLiabilities = accountsPayable + accruedExpenses + currentPortionLtd + otherCurrentLiabilities
    const totalLongTermLiabilities = longTermDebt + deferredTaxLiabilities + otherLongTermLiabilities
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

    const totalEquity = retainedEarnings + ownersEquity
    // Operating Working Capital = AR + Inventory - AP (shared utility, PROD-010)
    const workingCapital = calculateWorkingCapital({
      accountsReceivable,
      inventory,
      accountsPayable,
    })

    // Upsert balance sheet
    const bs = await prisma.balanceSheet.upsert({
      where: { periodId },
      create: {
        periodId,
        // Current Assets
        cash,
        accountsReceivable,
        inventory,
        prepaidExpenses,
        otherCurrentAssets,
        // Long-term Assets
        ppeGross,
        accumulatedDepreciation,
        intangibleAssets,
        otherLongTermAssets,
        // Current Liabilities
        accountsPayable,
        accruedExpenses,
        currentPortionLtd,
        otherCurrentLiabilities,
        // Long-term Liabilities
        longTermDebt,
        deferredTaxLiabilities,
        otherLongTermLiabilities,
        // Equity
        retainedEarnings,
        ownersEquity,
        // Calculated
        totalCurrentAssets,
        totalLongTermAssets,
        totalAssets,
        totalCurrentLiabilities,
        totalLongTermLiabilities,
        totalLiabilities,
        totalEquity,
        workingCapital,
      },
      update: {
        // Current Assets
        cash,
        accountsReceivable,
        inventory,
        prepaidExpenses,
        otherCurrentAssets,
        // Long-term Assets
        ppeGross,
        accumulatedDepreciation,
        intangibleAssets,
        otherLongTermAssets,
        // Current Liabilities
        accountsPayable,
        accruedExpenses,
        currentPortionLtd,
        otherCurrentLiabilities,
        // Long-term Liabilities
        longTermDebt,
        deferredTaxLiabilities,
        otherLongTermLiabilities,
        // Equity
        retainedEarnings,
        ownersEquity,
        // Calculated
        totalCurrentAssets,
        totalLongTermAssets,
        totalAssets,
        totalCurrentLiabilities,
        totalLongTermLiabilities,
        totalLiabilities,
        totalEquity,
        workingCapital,
      }
    })

    // Update company dossier (non-blocking)
    triggerDossierUpdate(companyId, 'financial_data_updated', periodId)

    return NextResponse.json({
      balanceSheet: {
        id: bs.id,
        periodId: bs.periodId,
        // Current Assets
        cash: Number(bs.cash),
        accountsReceivable: Number(bs.accountsReceivable),
        inventory: Number(bs.inventory),
        prepaidExpenses: Number(bs.prepaidExpenses),
        otherCurrentAssets: Number(bs.otherCurrentAssets),
        // Long-term Assets
        ppeGross: Number(bs.ppeGross),
        accumulatedDepreciation: Number(bs.accumulatedDepreciation),
        intangibleAssets: Number(bs.intangibleAssets),
        otherLongTermAssets: Number(bs.otherLongTermAssets),
        // Current Liabilities
        accountsPayable: Number(bs.accountsPayable),
        accruedExpenses: Number(bs.accruedExpenses),
        currentPortionLtd: Number(bs.currentPortionLtd),
        otherCurrentLiabilities: Number(bs.otherCurrentLiabilities),
        // Long-term Liabilities
        longTermDebt: Number(bs.longTermDebt),
        deferredTaxLiabilities: Number(bs.deferredTaxLiabilities),
        otherLongTermLiabilities: Number(bs.otherLongTermLiabilities),
        // Equity
        retainedEarnings: Number(bs.retainedEarnings),
        ownersEquity: Number(bs.ownersEquity),
        // Calculated
        totalCurrentAssets: Number(bs.totalCurrentAssets),
        totalLongTermAssets: Number(bs.totalLongTermAssets),
        totalAssets: Number(bs.totalAssets),
        totalCurrentLiabilities: Number(bs.totalCurrentLiabilities),
        totalLongTermLiabilities: Number(bs.totalLongTermLiabilities),
        totalLiabilities: Number(bs.totalLiabilities),
        totalEquity: Number(bs.totalEquity),
        workingCapital: Number(bs.workingCapital),
        createdAt: bs.createdAt.toISOString(),
        updatedAt: bs.updatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error saving balance sheet:', error)
    return NextResponse.json(
      { error: 'Failed to save balance sheet' },
      { status: 500 }
    )
  }
}
