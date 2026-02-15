import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { mergeCompanies, mergePeople } from '@/lib/contact-system/identity-resolution'

/**
 * PUT /api/canonical/duplicates/[id]
 * Resolve a duplicate candidate
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // SECURITY FIX (SEC-032): Resolving duplicates is a destructive admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { resolution, primaryId } = body

    // resolution: 'MERGE', 'NOT_DUPLICATE', 'SKIP'

    if (!['MERGE', 'NOT_DUPLICATE', 'SKIP'].includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution. Must be MERGE, NOT_DUPLICATE, or SKIP' },
        { status: 400 }
      )
    }

    const candidate = await prisma.duplicateCandidate.findUnique({
      where: { id },
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Duplicate candidate not found' }, { status: 404 })
    }

    if (candidate.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Duplicate candidate has already been resolved' },
        { status: 400 }
      )
    }

    // Handle merge
    if (resolution === 'MERGE') {
      if (!primaryId) {
        return NextResponse.json(
          { error: 'primaryId is required for MERGE resolution' },
          { status: 400 }
        )
      }

      if (candidate.entityType === 'COMPANY') {
        const duplicateId = primaryId === candidate.companyAId
          ? candidate.companyBId
          : candidate.companyAId

        if (!duplicateId) {
          return NextResponse.json({ error: 'Invalid company IDs' }, { status: 400 })
        }

        await mergeCompanies(primaryId, [duplicateId], result.auth.user.id)
      } else {
        const duplicateId = primaryId === candidate.personAId
          ? candidate.personBId
          : candidate.personAId

        if (!duplicateId) {
          return NextResponse.json({ error: 'Invalid person IDs' }, { status: 400 })
        }

        await mergePeople(primaryId, [duplicateId], result.auth.user.id)
      }
    }

    // Update candidate status
    const updated = await prisma.duplicateCandidate.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution: resolution === 'MERGE' ? 'MERGED' : resolution === 'NOT_DUPLICATE' ? 'NOT_DUPLICATE' : 'SKIPPED',
        resolvedAt: new Date(),
        resolvedByUserId: result.auth.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      candidate: updated,
      message: resolution === 'MERGE'
        ? 'Records merged successfully'
        : `Marked as ${resolution.toLowerCase().replace('_', ' ')}`,
    })
  } catch (error) {
    console.error('Error resolving duplicate:', error)

    if (error instanceof Error && error.message.includes('not found or already merged')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/canonical/duplicates/[id]
 * Delete a duplicate candidate (remove from queue without resolving)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // SECURITY FIX (SEC-032): Deleting duplicates is a destructive admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const candidate = await prisma.duplicateCandidate.findUnique({
      where: { id },
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Duplicate candidate not found' }, { status: 404 })
    }

    await prisma.duplicateCandidate.delete({ where: { id } })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting duplicate candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
