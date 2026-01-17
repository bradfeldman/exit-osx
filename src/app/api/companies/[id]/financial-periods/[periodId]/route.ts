import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PeriodType, Quarter } from '@prisma/client'

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
    // Verify user has access and get period with all related data
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

    const period = await prisma.financialPeriod.findUnique({
      where: { id: periodId },
      include: {
        incomeStatement: true,
        balanceSheet: true,
        adjustments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!period || period.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    return NextResponse.json({
      period: {
        id: period.id,
        periodType: period.periodType,
        fiscalYear: period.fiscalYear,
        quarter: period.quarter,
        month: period.month,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label || generatePeriodLabel(period),
        createdAt: period.createdAt.toISOString(),
        incomeStatement: period.incomeStatement ? {
          id: period.incomeStatement.id,
          grossRevenue: Number(period.incomeStatement.grossRevenue),
          cogs: Number(period.incomeStatement.cogs),
          operatingExpenses: Number(period.incomeStatement.operatingExpenses),
          grossProfit: Number(period.incomeStatement.grossProfit),
          grossMarginPct: Number(period.incomeStatement.grossMarginPct),
          ebitda: Number(period.incomeStatement.ebitda),
          ebitdaMarginPct: Number(period.incomeStatement.ebitdaMarginPct),
          depreciation: period.incomeStatement.depreciation ? Number(period.incomeStatement.depreciation) : null,
          amortization: period.incomeStatement.amortization ? Number(period.incomeStatement.amortization) : null,
          interestExpense: period.incomeStatement.interestExpense ? Number(period.incomeStatement.interestExpense) : null,
          taxExpense: period.incomeStatement.taxExpense ? Number(period.incomeStatement.taxExpense) : null,
        } : null,
        balanceSheet: period.balanceSheet ? {
          id: period.balanceSheet.id,
          // Current Assets
          cash: Number(period.balanceSheet.cash),
          accountsReceivable: Number(period.balanceSheet.accountsReceivable),
          inventory: Number(period.balanceSheet.inventory),
          prepaidExpenses: Number(period.balanceSheet.prepaidExpenses),
          otherCurrentAssets: Number(period.balanceSheet.otherCurrentAssets),
          // Long-term Assets
          ppeGross: Number(period.balanceSheet.ppeGross),
          accumulatedDepreciation: Number(period.balanceSheet.accumulatedDepreciation),
          intangibleAssets: Number(period.balanceSheet.intangibleAssets),
          otherLongTermAssets: Number(period.balanceSheet.otherLongTermAssets),
          // Current Liabilities
          accountsPayable: Number(period.balanceSheet.accountsPayable),
          accruedExpenses: Number(period.balanceSheet.accruedExpenses),
          currentPortionLtd: Number(period.balanceSheet.currentPortionLtd),
          otherCurrentLiabilities: Number(period.balanceSheet.otherCurrentLiabilities),
          // Long-term Liabilities
          longTermDebt: Number(period.balanceSheet.longTermDebt),
          deferredTaxLiabilities: Number(period.balanceSheet.deferredTaxLiabilities),
          otherLongTermLiabilities: Number(period.balanceSheet.otherLongTermLiabilities),
          // Equity
          retainedEarnings: Number(period.balanceSheet.retainedEarnings),
          ownersEquity: Number(period.balanceSheet.ownersEquity),
          // Calculated
          totalCurrentAssets: Number(period.balanceSheet.totalCurrentAssets),
          totalLongTermAssets: Number(period.balanceSheet.totalLongTermAssets),
          totalAssets: Number(period.balanceSheet.totalAssets),
          totalCurrentLiabilities: Number(period.balanceSheet.totalCurrentLiabilities),
          totalLongTermLiabilities: Number(period.balanceSheet.totalLongTermLiabilities),
          totalLiabilities: Number(period.balanceSheet.totalLiabilities),
          totalEquity: Number(period.balanceSheet.totalEquity),
          workingCapital: Number(period.balanceSheet.workingCapital),
        } : null,
        adjustments: period.adjustments.map(adj => ({
          id: adj.id,
          description: adj.description,
          amount: Number(adj.amount),
          type: adj.type,
          createdAt: adj.createdAt.toISOString(),
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching financial period:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial period' },
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
    const { startDate, endDate, label } = body

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
    const existingPeriod = await prisma.financialPeriod.findUnique({
      where: { id: periodId }
    })

    if (!existingPeriod || existingPeriod.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // Update the period (only dates and label can be updated)
    const updateData: { startDate?: Date; endDate?: Date; label?: string | null } = {}
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (label !== undefined) updateData.label = label || null

    const period = await prisma.financialPeriod.update({
      where: { id: periodId },
      data: updateData
    })

    return NextResponse.json({
      period: {
        id: period.id,
        periodType: period.periodType,
        fiscalYear: period.fiscalYear,
        quarter: period.quarter,
        month: period.month,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label || generatePeriodLabel(period),
        createdAt: period.createdAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error updating financial period:', error)
    return NextResponse.json(
      { error: 'Failed to update financial period' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existingPeriod = await prisma.financialPeriod.findUnique({
      where: { id: periodId }
    })

    if (!existingPeriod || existingPeriod.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    // Delete the period (cascades to income statement, balance sheet)
    // Adjustments will have their periodId set to null
    await prisma.financialPeriod.delete({
      where: { id: periodId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting financial period:', error)
    return NextResponse.json(
      { error: 'Failed to delete financial period' },
      { status: 500 }
    )
  }
}

// Helper function to generate period label
function generatePeriodLabel(period: {
  periodType: PeriodType
  fiscalYear: number
  quarter?: Quarter | null
  month?: number | null
}): string {
  switch (period.periodType) {
    case 'ANNUAL':
      return `FY${period.fiscalYear}`
    case 'QUARTERLY':
      return `${period.quarter} ${period.fiscalYear}`
    case 'MONTHLY':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[(period.month || 1) - 1]} ${period.fiscalYear}`
    default:
      return `${period.fiscalYear}`
  }
}
