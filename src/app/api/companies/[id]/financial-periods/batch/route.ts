import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PeriodType } from '@prisma/client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access to company and get FYE settings
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

    const fyeMonth = company.fiscalYearEndMonth || 12
    const fyeDay = company.fiscalYearEndDay || 31

    const now = new Date()
    const currentYear = now.getFullYear()

    // Build period definitions: FY(currentYear-3), FY(currentYear-2), FY(currentYear-1)
    const periodDefs: Array<{
      periodType: PeriodType
      fiscalYear: number
      startDate: Date
      endDate: Date
      label: string
    }> = []

    const isCalendarYear = fyeMonth === 12 && fyeDay === 31

    for (let offset = 3; offset >= 1; offset--) {
      const fy = currentYear - offset
      const endDate = new Date(fy, fyeMonth - 1, fyeDay)
      const startDate = new Date(fy - 1, fyeMonth - 1, fyeDay + 1)
      const label = isCalendarYear
        ? `FY${fy}`
        : `FY${fy} (YE ${getMonthShort(fyeMonth)} ${fyeDay})`

      periodDefs.push({
        periodType: 'ANNUAL' as PeriodType,
        fiscalYear: fy,
        startDate,
        endDate,
        label,
      })
    }

    // T12 conditional logic:
    // T12 end = last day of prior month
    // If T12 end equals FY(currentYear-1) end, skip T12
    const t12End = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prior month
    const lastFyEnd = new Date(currentYear - 1, fyeMonth - 1, fyeDay)

    const t12MatchesFy = t12End.getFullYear() === lastFyEnd.getFullYear()
      && t12End.getMonth() === lastFyEnd.getMonth()
      && t12End.getDate() === lastFyEnd.getDate()

    if (!t12MatchesFy) {
      const t12Start = new Date(t12End.getFullYear() - 1, t12End.getMonth() + 1, 1)
      const t12Label = `T12 (${getMonthShort(t12Start.getMonth() + 1)} ${t12Start.getFullYear()} - ${getMonthShort(t12End.getMonth() + 1)} ${t12End.getFullYear()})`

      periodDefs.push({
        periodType: 'ANNUAL' as PeriodType,
        fiscalYear: t12End.getFullYear(),
        startDate: t12Start,
        endDate: t12End,
        label: t12Label,
      })
    }

    // Use transaction: query existing, filter, create only missing
    const result = await prisma.$transaction(async (tx) => {
      // Find existing periods for this company
      const existing = await tx.financialPeriod.findMany({
        where: {
          companyId,
          periodType: 'ANNUAL',
          fiscalYear: { in: periodDefs.map(p => p.fiscalYear) },
        },
        select: { fiscalYear: true, label: true },
      })

      // Build a set of existing (fiscalYear + label prefix) for dedup
      const existingKeys = new Set(
        existing.map(e => `${e.fiscalYear}::${e.label?.startsWith('T12') ? 'T12' : 'FY'}`)
      )

      const toCreate = periodDefs.filter(p => {
        const key = `${p.fiscalYear}::${p.label.startsWith('T12') ? 'T12' : 'FY'}`
        return !existingKeys.has(key)
      })

      const created = []
      for (const def of toCreate) {
        const period = await tx.financialPeriod.create({
          data: {
            companyId,
            periodType: def.periodType,
            fiscalYear: def.fiscalYear,
            startDate: def.startDate,
            endDate: def.endDate,
            label: def.label,
          },
        })
        created.push({
          id: period.id,
          periodType: period.periodType,
          fiscalYear: period.fiscalYear,
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          label: period.label,
          hasIncomeStatement: false,
          hasBalanceSheet: false,
          adjustmentCount: 0,
          ebitda: null,
          createdAt: period.createdAt.toISOString(),
        })
      }

      return { created, skipped: periodDefs.length - toCreate.length }
    })

    // Re-fetch all periods for this company (so caller has full list)
    const allPeriods = await prisma.financialPeriod.findMany({
      where: { companyId },
      orderBy: [{ fiscalYear: 'asc' }],
      include: {
        incomeStatement: { select: { id: true, ebitda: true } },
        balanceSheet: { select: { id: true } },
        _count: { select: { adjustments: true } },
      },
    })

    const periods = allPeriods.map(period => ({
      id: period.id,
      periodType: period.periodType,
      fiscalYear: period.fiscalYear,
      quarter: period.quarter,
      month: period.month,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      label: period.label || `FY${period.fiscalYear}`,
      hasIncomeStatement: !!period.incomeStatement,
      hasBalanceSheet: !!period.balanceSheet,
      adjustmentCount: period._count.adjustments,
      ebitda: period.incomeStatement ? Number(period.incomeStatement.ebitda) : null,
      createdAt: period.createdAt.toISOString(),
    }))

    return NextResponse.json({
      periods,
      created: result.created.length,
      skipped: result.skipped,
    }, { status: 201 })
  } catch (error) {
    console.error('Error batch-creating financial periods:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create financial periods' },
      { status: 500 }
    )
  }
}

function getMonthShort(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month - 1] || 'Jan'
}
