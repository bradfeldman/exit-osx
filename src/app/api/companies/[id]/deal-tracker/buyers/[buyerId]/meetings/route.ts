import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { MeetingType } from '@prisma/client'
import { ACTIVITY_TYPES } from '@/lib/deal-tracker/constants'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postSchema = z.object({
  meetingType: z.enum(['INTRO', 'MANAGEMENT_PRESENTATION', 'SITE_VISIT', 'DUE_DILIGENCE', 'NEGOTIATION', 'OTHER']),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  scheduledAt: z.string().max(100),
  duration: z.coerce.number().int().min(0).optional(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().max(2000).optional(),
  attendees: z.array(z.string().max(500)).max(100).optional(),
})

const putSchema = z.object({
  meetingId: z.string().uuid(),
  meetingType: z.enum(['INTRO', 'MANAGEMENT_PRESENTATION', 'SITE_VISIT', 'DUE_DILIGENCE', 'NEGOTIATION', 'OTHER']).optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  scheduledAt: z.string().max(100).optional(),
  duration: z.coerce.number().int().min(0).optional(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().max(2000).optional(),
  attendees: z.array(z.string().max(500)).max(100).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  completedAt: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional(),
})

/**
 * GET /api/companies/[id]/deal-tracker/buyers/[buyerId]/meetings
 * Get all meetings for a buyer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { buyerId }
    if (status) where.status = status
    if (upcoming) {
      where.scheduledAt = { gte: new Date() }
      where.status = 'scheduled'
    }

    const meetings = await prisma.dealMeeting.findMany({
      where,
      orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
    })

    // Get creator info
    const creatorIds = [...new Set(meetings.map(m => m.createdById).filter(Boolean))]
    const creators = creatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const creatorMap = new Map(creators.map(u => [u.id, u]))

    const meetingsWithCreators = meetings.map(meeting => ({
      ...meeting,
      createdBy: creatorMap.get(meeting.createdById) || null,
    }))

    return NextResponse.json({ meetings: meetingsWithCreators })
  } catch (error) {
    console.error('Error fetching meetings:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/deal-tracker/buyers/[buyerId]/meetings
 * Schedule a meeting
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, postSchema)
    if (!validation.success) return validation.error
    const {
      meetingType,
      title,
      description,
      scheduledAt,
      duration,
      location,
      meetingLink,
      attendees,
    } = validation.data

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const meeting = await prisma.dealMeeting.create({
      data: {
        buyerId,
        meetingType: meetingType as MeetingType,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration,
        location,
        meetingLink,
        attendees: attendees || [],
        createdById: result.auth.user.id,
      },
    })

    // Log activity
    await prisma.dealActivity.create({
      data: {
        buyerId,
        activityType: ACTIVITY_TYPES.MEETING_SCHEDULED,
        description: `Scheduled meeting: ${title}`,
        metadata: {
          meetingId: meeting.id,
          meetingType,
          scheduledAt,
        },
        performedById: result.auth.user.id,
      },
    })

    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    console.error('Error scheduling meeting:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/deal-tracker/buyers/[buyerId]/meetings
 * Update a meeting
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, putSchema)
    if (!validation.success) return validation.error
    const {
      meetingId,
      meetingType,
      title,
      description,
      scheduledAt,
      duration,
      location,
      meetingLink,
      attendees,
      status,
      completedAt,
      notes,
    } = validation.data

    // Verify buyer and meeting belong to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const existing = await prisma.dealMeeting.findFirst({
      where: { id: meetingId, buyerId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (meetingType !== undefined) updateData.meetingType = meetingType as MeetingType
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt)
    if (duration !== undefined) updateData.duration = duration
    if (location !== undefined) updateData.location = location
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink
    if (attendees !== undefined) updateData.attendees = attendees
    if (status !== undefined) updateData.status = status
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null
    if (notes !== undefined) updateData.notes = notes

    const meeting = await prisma.dealMeeting.update({
      where: { id: meetingId },
      data: updateData,
    })

    // Log activity if status changed
    if (status && status !== existing.status) {
      const activityType = status === 'completed'
        ? ACTIVITY_TYPES.MEETING_COMPLETED
        : status === 'cancelled'
        ? ACTIVITY_TYPES.MEETING_CANCELLED
        : ACTIVITY_TYPES.MEETING_SCHEDULED

      await prisma.dealActivity.create({
        data: {
          buyerId,
          activityType,
          description: `Meeting ${status}: ${meeting.title}`,
          metadata: {
            meetingId: meeting.id,
            status,
            notes,
          },
          performedById: result.auth.user.id,
        },
      })
    }

    return NextResponse.json({ meeting })
  } catch (error) {
    console.error('Error updating meeting:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/deal-tracker/buyers/[buyerId]/meetings
 * Delete a meeting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
    }

    // Verify buyer and meeting belong to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const meeting = await prisma.dealMeeting.findFirst({
      where: { id: meetingId, buyerId },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    await prisma.dealMeeting.delete({
      where: { id: meetingId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting meeting:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
