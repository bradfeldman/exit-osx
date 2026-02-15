import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PeriodType, Quarter } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

export async function GET(
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
    // Verify user has access to company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } }
            }
          }
        },
        financialPeriods: {
          orderBy: [
            { fiscalYear: 'desc' },
            { quarter: 'asc' },
            { month: 'asc' }
          ],
          include: {
            incomeStatement: {
              select: { id: true, ebitda: true }
            },
            balanceSheet: {
              select: { id: true }
            },
            _count: {
              select: { adjustments: true }
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

    // Transform periods for response
    const periods = company.financialPeriods.map(period => ({
      id: period.id,
      periodType: period.periodType,
      fiscalYear: period.fiscalYear,
      quarter: period.quarter,
      month: period.month,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      label: period.label || generatePeriodLabel(period),
      hasIncomeStatement: !!period.incomeStatement,
      hasBalanceSheet: !!period.balanceSheet,
      adjustmentCount: period._count.adjustments,
      ebitda: period.incomeStatement ? Number(period.incomeStatement.ebitda) : null,
      createdAt: period.createdAt.toISOString(),
    }))

    return NextResponse.json({ periods })
  } catch (error) {
    console.error('Error fetching financial periods:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch financial periods' },
      { status: 500 }
    )
  }
}

const financialPeriodCreateSchema = z.object({
  periodType: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY']),
  fiscalYear: z.coerce.number().int().min(1900).max(2100),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  startDate: z.string().max(100),
  endDate: z.string().max(100),
  label: z.string().max(100).optional().nullable(),
}).refine(
  (data) => data.periodType !== 'QUARTERLY' || data.quarter,
  { message: 'Quarter is required for quarterly periods', path: ['quarter'] }
).refine(
  (data) => data.periodType !== 'MONTHLY' || data.month,
  { message: 'Month is required for monthly periods', path: ['month'] }
)

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

  const validation = await validateRequestBody(request, financialPeriodCreateSchema)
  if (!validation.success) return validation.error

  const { periodType, fiscalYear, quarter, month, startDate, endDate, label } = validation.data

  try {

    // Verify user has access to company
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

    // Check for duplicate fiscal year (for annual periods)
    if (periodType === 'ANNUAL') {
      const existingPeriod = await prisma.financialPeriod.findFirst({
        where: {
          companyId,
          periodType: 'ANNUAL',
          fiscalYear,
        }
      })

      if (existingPeriod) {
        return NextResponse.json(
          { error: `Fiscal year ${fiscalYear} already exists for this company` },
          { status: 409 }
        )
      }
    }

    // Create the financial period
    const period = await prisma.financialPeriod.create({
      data: {
        companyId,
        periodType: periodType as PeriodType,
        fiscalYear,
        quarter: quarter as Quarter | undefined,
        month: month || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        label: label || null,
      }
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
        hasIncomeStatement: false,
        hasBalanceSheet: false,
        adjustmentCount: 0,
        ebitda: null,
        createdAt: period.createdAt.toISOString(),
      }
    }, { status: 201 })
  } catch (error) {
    // Handle unique constraint violation
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'A period with these parameters already exists' },
        { status: 409 }
      )
    }

    console.error('Error creating financial period:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create financial period' },
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
