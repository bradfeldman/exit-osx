import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId, adjustmentId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: {
                user: { authId: user.id }
              }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify adjustment belongs to this company
    const adjustment = await prisma.ebitdaAdjustment.findUnique({
      where: { id: adjustmentId }
    })

    if (!adjustment || adjustment.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Adjustment not found' },
        { status: 404 }
      )
    }

    await prisma.ebitdaAdjustment.delete({
      where: { id: adjustmentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting adjustment:', error)
    return NextResponse.json(
      { error: 'Failed to delete adjustment' },
      { status: 500 }
    )
  }
}
