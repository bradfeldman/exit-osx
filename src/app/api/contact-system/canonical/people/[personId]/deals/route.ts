import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

type RouteParams = Promise<{ personId: string }>

/**
 * GET /api/contact-system/canonical/people/[personId]/deals
 * Get all deal contacts for a person (cross-deal history / institutional memory)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  // SECURITY FIX (PROD-060): Was completely unauthenticated — anyone could access contact deal history.
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { personId } = await params

    // Verify person exists
    const person = await prisma.canonicalPerson.findUnique({
      where: { id: personId },
      select: { id: true, firstName: true, lastName: true }
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    // Get all deal contacts for this person
    const dealContacts = await prisma.dealContact.findMany({
      where: {
        canonicalPersonId: personId
      },
      include: {
        dealBuyer: {
          include: {
            deal: {
              select: {
                id: true,
                codeName: true,
                status: true,
                company: {
                  select: {
                    name: true
                  }
                }
              }
            },
            canonicalCompany: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to use 'name' for easier consumption
    const transformedContacts = dealContacts.map((dc) => ({
      ...dc,
      dealBuyer: {
        ...dc.dealBuyer,
        deal: {
          ...dc.dealBuyer.deal,
          name: dc.dealBuyer.deal.codeName
        }
      }
    }))

    // Calculate summary stats
    const stats = {
      totalDeals: dealContacts.length,
      activeDeals: dealContacts.filter(
        (dc) => dc.dealBuyer.deal.status === 'ACTIVE'
      ).length,
      closedDeals: dealContacts.filter(
        (dc) => dc.dealBuyer.currentStage === 'CLOSED'
      ).length,
      primaryContactIn: dealContacts.filter((dc) => dc.isPrimary).length,
      uniqueCompanies: new Set(
        dealContacts.map((dc) => dc.dealBuyer.canonicalCompanyId)
      ).size,
    }

    return NextResponse.json({
      person: {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`
      },
      dealContacts: transformedContacts,
      stats
    })
  } catch (error) {
    console.error('Error fetching person deal history:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch deal history' },
      { status: 500 }
    )
  }
}
