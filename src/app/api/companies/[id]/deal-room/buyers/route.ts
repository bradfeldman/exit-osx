import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postSchema = z.object({
  companyName: z.string().min(1).max(500),
  buyerType: z.enum(['STRATEGIC', 'FINANCIAL', 'INDIVIDUAL', 'MANAGEMENT', 'ESOP', 'OTHER']).default('OTHER'),
  contactName: z.string().min(1).max(500),
  contactEmail: z.string().email().max(500),
  contactTitle: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  tier: z.enum(['A_TIER', 'B_TIER', 'C_TIER', 'D_TIER']).default('B_TIER'),
  tags: z.array(z.string().max(100)).max(50).default([]),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error
    const { auth } = result

    const validation = await validateRequestBody(request, postSchema)
    if (!validation.success) return validation.error
    const {
      companyName,
      buyerType,
      contactName,
      contactEmail,
      contactTitle,
      notes,
      tier,
      tags,
    } = validation.data

    // Find or create active deal
    const deal = await prisma.deal.findFirst({
      where: { companyId, status: 'ACTIVE' },
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'No active deal found. Please activate the Deal Room first.' },
        { status: 400 }
      )
    }

    // Find or create CanonicalCompany
    const normalizedName = companyName.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
    let canonicalCompany = await prisma.canonicalCompany.findFirst({
      where: { normalizedName },
    })

    if (!canonicalCompany) {
      canonicalCompany = await prisma.canonicalCompany.create({
        data: {
          name: companyName.trim(),
          normalizedName,
          companyType: buyerType,
        },
      })
    }

    // Find or create CanonicalPerson
    const nameParts = contactName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? contactName.trim()
    const lastName = nameParts.slice(1).join(' ') || ''
    const normalizedPersonName = `${firstName} ${lastName}`.toLowerCase().trim()

    let canonicalPerson = await prisma.canonicalPerson.findFirst({
      where: { email: contactEmail.toLowerCase().trim() },
    })

    if (!canonicalPerson) {
      canonicalPerson = await prisma.canonicalPerson.create({
        data: {
          firstName,
          lastName,
          normalizedName: normalizedPersonName,
          email: contactEmail.toLowerCase().trim(),
          currentTitle: contactTitle ?? null,
          currentCompanyId: canonicalCompany.id,
        },
      })
    }

    // Check for duplicate buyer in this deal
    const existingBuyer = await prisma.dealBuyer.findFirst({
      where: {
        dealId: deal.id,
        canonicalCompanyId: canonicalCompany.id,
      },
    })

    if (existingBuyer) {
      return NextResponse.json(
        { error: 'This buyer is already in your pipeline' },
        { status: 409 }
      )
    }

    // Create DealBuyer
    const dealBuyer = await prisma.dealBuyer.create({
      data: {
        dealId: deal.id,
        canonicalCompanyId: canonicalCompany.id,
        currentStage: 'IDENTIFIED',
        tier,
        tags,
        internalNotes: notes ?? null,
        createdByUserId: auth.user.id,
      },
    })

    // Create DealContact
    await prisma.dealContact.create({
      data: {
        dealBuyerId: dealBuyer.id,
        canonicalPersonId: canonicalPerson.id,
        role: 'PRIMARY',
        isPrimary: true,
      },
    })

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId: deal.id,
        dealBuyerId: dealBuyer.id,
        activityType: 'NOTE_ADDED',
        subject: `${companyName} added to pipeline`,
        description: notes ?? null,
        performedByUserId: auth.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      buyer: {
        id: dealBuyer.id,
        companyName: canonicalCompany.name,
        buyerType: canonicalCompany.companyType,
        stage: dealBuyer.currentStage,
      },
    })
  } catch (error) {
    console.error('Error adding buyer:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to add buyer' },
      { status: 500 }
    )
  }
}
