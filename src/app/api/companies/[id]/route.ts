import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_VIEW', id)
  if (isAuthError(result)) return result.error

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true,
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!company || company.deletedAt) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error fetching company:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_UPDATE', id)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()

    // Verify company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.icbIndustry !== undefined) updateData.icbIndustry = body.icbIndustry
    if (body.icbSuperSector !== undefined) updateData.icbSuperSector = body.icbSuperSector
    if (body.icbSector !== undefined) updateData.icbSector = body.icbSector
    if (body.icbSubSector !== undefined) updateData.icbSubSector = body.icbSubSector
    if (body.annualRevenue !== undefined) updateData.annualRevenue = body.annualRevenue
    if (body.annualEbitda !== undefined) updateData.annualEbitda = body.annualEbitda
    if (body.ownerCompensation !== undefined) updateData.ownerCompensation = body.ownerCompensation
    if (body.fiscalYearEndMonth !== undefined) updateData.fiscalYearEndMonth = body.fiscalYearEndMonth
    if (body.fiscalYearEndDay !== undefined) updateData.fiscalYearEndDay = body.fiscalYearEndDay

    // Update company
    const company = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        coreFactors: true,
        ebitdaAdjustments: true
      }
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error updating company:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_DELETE', id)
  if (isAuthError(result)) return result.error

  try {
    // Parse optional reason from request body
    let reason: string | null = null
    try {
      const body = await request.json()
      reason = body.reason || null
    } catch {
      // No body or invalid JSON is fine - reason is optional
    }

    // Verify company exists and is not already deleted
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (existingCompany.deletedAt) {
      return NextResponse.json({ error: 'Company is already deleted' }, { status: 400 })
    }

    // Soft delete - set deletedAt timestamp, company remains for 30 days
    await prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deleteReason: reason,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Company has been scheduled for deletion. It will be permanently removed after 30 days.'
    })
  } catch (error) {
    console.error('Error deleting company:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    )
  }
}
