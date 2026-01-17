import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
    const ebitda = grossProfit - operatingExpenses
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
    console.error('Error saving income statement:', error)
    return NextResponse.json(
      { error: 'Failed to save income statement' },
      { status: 500 }
    )
  }
}
