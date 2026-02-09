import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { RevenueSizeCategory } from '@prisma/client'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { triggerDossierUpdate } from '@/lib/dossier/build-dossier'

// Helper to determine revenue size category from actual revenue
function getRevenueSizeCategory(revenue: number): RevenueSizeCategory {
  if (revenue < 500000) return RevenueSizeCategory.UNDER_500K
  if (revenue < 1000000) return RevenueSizeCategory.FROM_500K_TO_1M
  if (revenue < 3000000) return RevenueSizeCategory.FROM_1M_TO_3M
  if (revenue < 10000000) return RevenueSizeCategory.FROM_3M_TO_10M
  if (revenue < 25000000) return RevenueSizeCategory.FROM_10M_TO_25M
  return RevenueSizeCategory.OVER_25M
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
      include: { incomeStatement: true }
    })

    if (!period || period.companyId !== companyId) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    if (!period.incomeStatement) {
      return NextResponse.json({ incomeStatement: null })
    }

    const stmt = period.incomeStatement
    return NextResponse.json({
      incomeStatement: {
        id: stmt.id,
        periodId: stmt.periodId,
        grossRevenue: Number(stmt.grossRevenue),
        cogs: Number(stmt.cogs),
        operatingExpenses: Number(stmt.operatingExpenses),
        grossProfit: Number(stmt.grossProfit),
        grossMarginPct: Number(stmt.grossMarginPct),
        ebitda: Number(stmt.ebitda),
        ebitdaMarginPct: Number(stmt.ebitdaMarginPct),
        depreciation: stmt.depreciation ? Number(stmt.depreciation) : null,
        amortization: stmt.amortization ? Number(stmt.amortization) : null,
        interestExpense: stmt.interestExpense ? Number(stmt.interestExpense) : null,
        taxExpense: stmt.taxExpense ? Number(stmt.taxExpense) : null,
        createdAt: stmt.createdAt.toISOString(),
        updatedAt: stmt.updatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching income statement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch income statement' },
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
      grossRevenue,
      cogs,
      operatingExpenses,
      depreciation,
      amortization,
      interestExpense,
      taxExpense
    } = body

    // Validate required fields
    if (grossRevenue === undefined || cogs === undefined || operatingExpenses === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: grossRevenue, cogs, operatingExpenses' },
        { status: 400 }
      )
    }

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
    const grossProfit = grossRevenue - cogs
    const grossMarginPct = grossRevenue > 0 ? grossProfit / grossRevenue : 0
    // EBITDA = Gross Profit - Total Expenses + D + A + I + T
    const ebitda = grossProfit - operatingExpenses + (depreciation ?? 0) + (amortization ?? 0) + (interestExpense ?? 0) + (taxExpense ?? 0)
    const ebitdaMarginPct = grossRevenue > 0 ? ebitda / grossRevenue : 0

    // Upsert income statement
    const stmt = await prisma.incomeStatement.upsert({
      where: { periodId },
      create: {
        periodId,
        grossRevenue,
        cogs,
        operatingExpenses,
        grossProfit,
        grossMarginPct,
        ebitda,
        ebitdaMarginPct,
        depreciation: depreciation ?? null,
        amortization: amortization ?? null,
        interestExpense: interestExpense ?? null,
        taxExpense: taxExpense ?? null,
      },
      update: {
        grossRevenue,
        cogs,
        operatingExpenses,
        grossProfit,
        grossMarginPct,
        ebitda,
        ebitdaMarginPct,
        depreciation: depreciation ?? null,
        amortization: amortization ?? null,
        interestExpense: interestExpense ?? null,
        taxExpense: taxExpense ?? null,
      }
    })

    // Sync revenue and EBITDA to Company table
    await prisma.company.update({
      where: { id: companyId },
      data: {
        annualRevenue: grossRevenue,
        annualEbitda: ebitda,
      }
    })

    // Update CoreFactors revenue size category based on actual revenue
    const newRevenueSizeCategory = getRevenueSizeCategory(grossRevenue)
    const coreFactors = await prisma.coreFactors.findUnique({
      where: { companyId }
    })

    if (coreFactors && coreFactors.revenueSizeCategory !== newRevenueSizeCategory) {
      await prisma.coreFactors.update({
        where: { companyId },
        data: { revenueSizeCategory: newRevenueSizeCategory }
      })
    }

    // Get previous snapshot value before recalculation (for impact display)
    let previousValue: number | null = null
    let previousEbitda: number | null = null
    try {
      const previousSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: { currentValue: true, adjustedEbitda: true },
      })
      if (previousSnapshot) {
        previousValue = Number(previousSnapshot.currentValue)
        previousEbitda = Number(previousSnapshot.adjustedEbitda)
      }
    } catch (e) {
      console.error('Failed to get previous snapshot:', e)
    }

    // Trigger valuation snapshot recalculation
    let valuationImpact: {
      previousValue: number | null
      newValue: number | null
      change: number | null
      previousEbitda: number | null
      newEbitda: number | null
      isFirstFinancials: boolean
    } | null = null

    try {
      const result = await recalculateSnapshotForCompany(companyId, 'P&L data updated')

      if (result.success && result.snapshotId) {
        // Get the new snapshot values
        const newSnapshot = await prisma.valuationSnapshot.findUnique({
          where: { id: result.snapshotId },
          select: { currentValue: true, adjustedEbitda: true },
        })

        if (newSnapshot) {
          const newValue = Number(newSnapshot.currentValue)
          const newEbitda = Number(newSnapshot.adjustedEbitda)
          valuationImpact = {
            previousValue,
            newValue,
            change: previousValue ? newValue - previousValue : null,
            previousEbitda,
            newEbitda,
            isFirstFinancials: previousEbitda === 0 || previousEbitda === null,
          }
        }
      }
    } catch (recalcError) {
      // Log but don't fail the request if recalculation fails
      console.error('Failed to recalculate valuation snapshot:', recalcError)
    }

    // Update company dossier (non-blocking)
    triggerDossierUpdate(companyId, 'financial_data_updated', periodId)

    return NextResponse.json({
      incomeStatement: {
        id: stmt.id,
        periodId: stmt.periodId,
        grossRevenue: Number(stmt.grossRevenue),
        cogs: Number(stmt.cogs),
        operatingExpenses: Number(stmt.operatingExpenses),
        grossProfit: Number(stmt.grossProfit),
        grossMarginPct: Number(stmt.grossMarginPct),
        ebitda: Number(stmt.ebitda),
        ebitdaMarginPct: Number(stmt.ebitdaMarginPct),
        depreciation: stmt.depreciation ? Number(stmt.depreciation) : null,
        amortization: stmt.amortization ? Number(stmt.amortization) : null,
        interestExpense: stmt.interestExpense ? Number(stmt.interestExpense) : null,
        taxExpense: stmt.taxExpense ? Number(stmt.taxExpense) : null,
        createdAt: stmt.createdAt.toISOString(),
        updatedAt: stmt.updatedAt.toISOString(),
      },
      valuationImpact,
    })
  } catch (error) {
    console.error('Error saving income statement:', error)
    return NextResponse.json(
      { error: 'Failed to save income statement' },
      { status: 500 }
    )
  }
}
