import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { normalizePersonName, normalizeCompanyName } from '@/lib/contact-system/identity-resolution'
import { validateRequestBody, uuidSchema, emailSchema, shortText } from '@/lib/security/validation'

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
    console.error('Error fetching canonical person:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const canonicalPersonUpdateSchema = z.object({
  firstName: shortText.optional(),
  lastName: shortText.optional(),
  email: emailSchema.optional().nullable(),
  phone: z.string().max(50).optional().nullable(), // Legacy
  phoneWork: z.string().max(50).optional().nullable(),
  phoneCell: z.string().max(50).optional().nullable(),
  linkedInUrl: z.string().max(2000).optional().nullable(),
  currentTitle: shortText.optional().nullable(),
  currentCompanyId: z.string().min(1).optional().nullable(),
  companyName: shortText.optional().nullable(),
  dataQuality: z.enum(['PROVISIONAL', 'SUGGESTED', 'VERIFIED', 'ENRICHED']).optional(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
})

/**
 * PUT /api/canonical/people/[id]
 * Update a canonical person
 * SECURITY FIX (SEC-090): Elevated to ORG_MANAGE_MEMBERS — canonical entities are
 * global/shared records. Write operations require admin-level workspace permission
 * to prevent cross-tenant data corruption.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
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

    const validation = await validateRequestBody(request, canonicalPersonUpdateSchema)
    if (!validation.success) return validation.error

    const {
      firstName,
      lastName,
      email,
      phone,
      phoneWork,
      phoneCell,
      linkedInUrl,
      currentTitle,
      currentCompanyId,
      companyName,
      dataQuality,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
    } = validation.data

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
    if (phone !== undefined) updateData.phoneWork = phone?.trim() || null // Legacy: phone maps to phoneWork
    if (phoneWork !== undefined) updateData.phoneWork = phoneWork?.trim() || null
    if (phoneCell !== undefined) updateData.phoneCell = phoneCell?.trim() || null
    if (linkedInUrl !== undefined) updateData.linkedInUrl = linkedInUrl?.trim() || null
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1?.trim() || null
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2?.trim() || null
    if (city !== undefined) updateData.city = city?.trim() || null
    if (state !== undefined) updateData.state = state?.trim() || null
    if (zip !== undefined) updateData.zip = zip?.trim() || null
    if (currentTitle !== undefined) updateData.currentTitle = currentTitle?.trim() || null
    if (currentCompanyId !== undefined) {
      updateData.currentCompanyId = currentCompanyId || null
    } else if (companyName !== undefined) {
      // Find or create canonical company by name
      if (companyName && companyName.trim()) {
        const normalized = normalizeCompanyName(companyName.trim())
        let company = await prisma.canonicalCompany.findFirst({
          where: { normalizedName: normalized, mergedIntoId: null },
        })
        if (!company) {
          company = await prisma.canonicalCompany.create({
            data: {
              name: companyName.trim(),
              normalizedName: normalized,
              dataQuality: 'ENRICHED',
            },
          })
        }
        updateData.currentCompanyId = company.id
      } else {
        updateData.currentCompanyId = null
      }
    }
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
    console.error('Error updating canonical person:', error instanceof Error ? error.message : String(error))
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
  // SECURITY FIX (SEC-032): Delete is a destructive admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
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
    console.error('Error deleting canonical person:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
