import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { normalizeCompanyName } from '@/lib/contact-system/identity-resolution'

/**
 * GET /api/canonical/companies/[id]
 * Get a single canonical company with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const company = await prisma.canonicalCompany.findUnique({
      where: { id },
      include: {
        domains: { select: { id: true, domain: true, isPrimary: true } },
        people: {
          where: { mergedIntoId: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            currentTitle: true,
            dataQuality: true,
          },
          take: 50,
        },
        dealBuyers: {
          select: {
            id: true,
            currentStage: true,
            approvalStatus: true,
            deal: {
              select: {
                id: true,
                codeName: true,
                status: true,
                company: { select: { id: true, name: true } },
              },
            },
          },
          take: 20,
        },
        companyGroupMemberships: {
          include: {
            group: { select: { id: true, name: true, groupType: true } },
          },
        },
        mergedInto: { select: { id: true, name: true } },
        mergedFrom: {
          select: { id: true, name: true, mergedAt: true },
          where: { mergedIntoId: id },
        },
        _count: {
          select: {
            people: true,
            dealBuyers: true,
            employmentHistory: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // If this company was merged into another, redirect to the surviving record
    if (company.mergedIntoId) {
      return NextResponse.json({
        merged: true,
        mergedIntoId: company.mergedIntoId,
        mergedInto: company.mergedInto,
        originalId: id,
        message: 'This company was merged into another record',
      })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error fetching canonical company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/canonical/companies/[id]
 * Update a canonical company
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    // Check if company exists and is not merged
    const existing = await prisma.canonicalCompany.findUnique({
      where: { id },
      select: { id: true, mergedIntoId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (existing.mergedIntoId) {
      return NextResponse.json(
        { error: 'Cannot update merged company. Update the surviving record instead.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      name,
      legalName,
      website,
      linkedInUrl,
      companyType,
      industryCode,
      industryName,
      headquarters,
      country,
      employeeCount,
      foundedYear,
      aum,
      description,
      dataQuality,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      updateData.name = name.trim()
      updateData.normalizedName = normalizeCompanyName(name)
    }
    if (legalName !== undefined) updateData.legalName = legalName?.trim() || null
    if (website !== undefined) updateData.website = website?.trim() || null
    if (linkedInUrl !== undefined) updateData.linkedInUrl = linkedInUrl?.trim() || null
    if (companyType !== undefined) updateData.companyType = companyType
    if (industryCode !== undefined) updateData.industryCode = industryCode?.trim() || null
    if (industryName !== undefined) updateData.industryName = industryName?.trim() || null
    if (headquarters !== undefined) updateData.headquarters = headquarters?.trim() || null
    if (country !== undefined) updateData.country = country?.trim() || null
    if (employeeCount !== undefined) updateData.employeeCount = employeeCount ? parseInt(employeeCount) : null
    if (foundedYear !== undefined) updateData.foundedYear = foundedYear ? parseInt(foundedYear) : null
    if (aum !== undefined) updateData.aum = aum || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (dataQuality !== undefined) {
      updateData.dataQuality = dataQuality
      if (dataQuality === 'VERIFIED') {
        updateData.verifiedAt = new Date()
        updateData.verifiedByUserId = result.auth.user.id
      }
    }

    const company = await prisma.canonicalCompany.update({
      where: { id },
      data: updateData,
      include: {
        domains: { select: { domain: true, isPrimary: true } },
      },
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error updating canonical company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/canonical/companies/[id]
 * Soft delete a canonical company (only if no active references)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    // Check if company exists and has no active references
    const company = await prisma.canonicalCompany.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            people: true,
            dealBuyers: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.mergedIntoId) {
      return NextResponse.json(
        { error: 'Company is already merged/deleted' },
        { status: 400 }
      )
    }

    if (company._count.people > 0 || company._count.dealBuyers > 0) {
      return NextResponse.json({
        error: 'Cannot delete company with active references',
        references: {
          people: company._count.people,
          dealBuyers: company._count.dealBuyers,
        },
      }, { status: 400 })
    }

    // Soft delete by setting mergedIntoId to a special "deleted" marker
    // In practice, we just delete the record since it has no references
    await prisma.$transaction([
      prisma.canonicalDomain.deleteMany({ where: { companyId: id } }),
      prisma.canonicalCompany.delete({ where: { id } }),
    ])

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting canonical company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
