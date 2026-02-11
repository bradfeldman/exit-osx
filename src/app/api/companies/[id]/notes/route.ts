import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', id)
    if (isAuthError(result)) return result.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const noteType = searchParams.get('noteType')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build search filter
    const where: {
      task: { companyId: string }
      content?: { contains: string; mode: 'insensitive' }
      noteType?: string
    } = {
      task: { companyId: id },
    }

    if (search && search.trim().length > 0) {
      where.content = {
        contains: search.trim(),
        mode: 'insensitive',
      }
    }

    if (noteType) {
      where.noteType = noteType
    }

    // Fetch notes with task context
    const notes = await prisma.taskNote.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            briCategory: true,
            status: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Get stats
    const stats = await prisma.taskNote.groupBy({
      by: ['noteType'],
      where: {
        task: { companyId: id },
      },
      _count: true,
    })

    return NextResponse.json({
      notes,
      stats: stats.map(s => ({
        noteType: s.noteType,
        count: s._count,
      })),
      total: notes.length,
    })
  } catch (error) {
    console.error('Error searching company notes:', error)
    return NextResponse.json(
      // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
      { error: 'Failed to search notes' },
      { status: 500 }
    )
  }
}
