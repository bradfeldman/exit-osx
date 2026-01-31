import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { normalizePersonName } from '@/lib/contact-system/identity-resolution'

/**
 * GET /api/canonical/people/[id]
 * Get a single canonical person with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const person = await prisma.canonicalPerson.findUnique({
      where: { id },
      include: {
        currentCompany: {
          select: { id: true, name: true, companyType: true },
        },
        employmentHistory: {
          include: {
            company: { select: { id: true, name: true } },
          },
          orderBy: [
            { isCurrent: 'desc' },
            { endDate: 'desc' },
            { startDate: 'desc' },
          ],
        },
        dealContacts: {
          include: {
            dealBuyer: {
              select: {
                id: true,
                currentStage: true,
                deal: {
                  select: {
                    id: true,
                    codeName: true,
                    company: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
          take: 20,
        },
        activities: {
          select: {
            id: true,
            activityType: true,
            subject: true,
            performedAt: true,
            deal: { select: { id: true, codeName: true } },
          },
          orderBy: { performedAt: 'desc' },
          take: 10,
        },
        emailAttempts: {
          select: {
            id: true,
            subject: true,
            status: true,
            sentAt: true,
            openedAt: true,
            repliedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        mergedInto: { select: { id: true, firstName: true, lastName: true } },
        mergedFrom: {
          select: { id: true, firstName: true, lastName: true, mergedAt: true },
          where: { mergedIntoId: id },
        },
        _count: {
          select: {
            dealContacts: true,
            employmentHistory: true,
            activities: true,
            emailAttempts: true,
          },
        },
      },
    })

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // If this person was merged into another, redirect
    if (person.mergedIntoId) {
      return NextResponse.json({
        merged: true,
        mergedIntoId: person.mergedIntoId,
        mergedInto: person.mergedInto,
        originalId: id,
        message: 'This person was merged into another record',
      })
    }

    return NextResponse.json({ person })
  } catch (error) {
    console.error('Error fetching canonical person:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/canonical/people/[id]
 * Update a canonical person
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    // Check if person exists and is not merged
    const existing = await prisma.canonicalPerson.findUnique({
      where: { id },
      select: { id: true, mergedIntoId: true, email: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    if (existing.mergedIntoId) {
      return NextResponse.json(
        { error: 'Cannot update merged person. Update the surviving record instead.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      linkedInUrl,
      currentTitle,
      currentCompanyId,
      dataQuality,
    } = body

    // If email is being changed, check uniqueness
    if (email !== undefined && email !== existing.email) {
      if (email) {
        const existingEmail = await prisma.canonicalPerson.findUnique({
          where: { email: email.toLowerCase() },
        })
        if (existingEmail && existingEmail.id !== id) {
          return NextResponse.json({
            error: 'Email already in use by another person',
          }, { status: 400 })
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (firstName !== undefined || lastName !== undefined) {
      const newFirst = firstName ?? (await prisma.canonicalPerson.findUnique({ where: { id } }))?.firstName ?? ''
      const newLast = lastName ?? (await prisma.canonicalPerson.findUnique({ where: { id } }))?.lastName ?? ''
      if (firstName !== undefined) updateData.firstName = firstName.trim()
      if (lastName !== undefined) updateData.lastName = lastName.trim()
      updateData.normalizedName = normalizePersonName(newFirst, newLast)
    }

    if (email !== undefined) updateData.email = email?.toLowerCase().trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (linkedInUrl !== undefined) updateData.linkedInUrl = linkedInUrl?.trim() || null
    if (currentTitle !== undefined) updateData.currentTitle = currentTitle?.trim() || null
    if (currentCompanyId !== undefined) updateData.currentCompanyId = currentCompanyId || null
    if (dataQuality !== undefined) {
      updateData.dataQuality = dataQuality
      if (dataQuality === 'VERIFIED') {
        updateData.verifiedAt = new Date()
      }
    }

    const person = await prisma.canonicalPerson.update({
      where: { id },
      data: updateData,
      include: {
        currentCompany: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ person })
  } catch (error) {
    console.error('Error updating canonical person:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/canonical/people/[id]
 * Delete a canonical person (only if no active references)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    const person = await prisma.canonicalPerson.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dealContacts: true,
            activities: true,
          },
        },
      },
    })

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    if (person.mergedIntoId) {
      return NextResponse.json(
        { error: 'Person is already merged/deleted' },
        { status: 400 }
      )
    }

    if (person._count.dealContacts > 0) {
      return NextResponse.json({
        error: 'Cannot delete person with active deal contacts',
        references: {
          dealContacts: person._count.dealContacts,
        },
      }, { status: 400 })
    }

    // Delete associated records first
    await prisma.$transaction([
      prisma.personEmployment.deleteMany({ where: { personId: id } }),
      prisma.canonicalPerson.delete({ where: { id } }),
    ])

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting canonical person:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
