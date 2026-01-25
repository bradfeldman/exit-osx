import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getUserNotifications, markNotificationsRead, getUnreadNotificationCount } from '@/lib/dataroom'

/**
 * GET /api/companies/[id]/dataroom/notifications
 * Get notifications for the current user for this company's data room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const countOnly = searchParams.get('countOnly') === 'true'

    if (countOnly) {
      const count = await getUnreadNotificationCount(result.auth.user.id, companyId)
      return NextResponse.json({ count })
    }

    const notifications = await getUserNotifications(result.auth.user.id, {
      unreadOnly,
      limit,
      companyId,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/dataroom/notifications
 * Mark notifications as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { notificationIds } = body // Optional: if not provided, marks all as read

    await markNotificationsRead(result.auth.user.id, notificationIds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
