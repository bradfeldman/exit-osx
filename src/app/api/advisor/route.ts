// Advisor Portal API
// GET - Get all clients for the current advisor

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getAdvisorClients, isExternalAdvisor } from '@/lib/auth/check-granular-permission'

// GET - Get advisor's clients
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: {
        advisorProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is an advisor
    const isAdvisor = await isExternalAdvisor(user.id)
    if (!isAdvisor) {
      return NextResponse.json({ error: 'Not an advisor' }, { status: 403 })
    }

    // Get all clients
    const clients = await getAdvisorClients(user.id)

    // Enrich with company details
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const company = await prisma.company.findUnique({
          where: { id: client.companyId },
          select: {
            id: true,
            name: true,
            icbIndustry: true,
            icbSuperSector: true,
            icbSector: true,
            createdAt: true,
          },
        })

        // Get latest valuation
        const latestSnapshot = await prisma.valuationSnapshot.findFirst({
          where: { companyId: client.companyId },
          orderBy: { createdAt: 'desc' },
          select: {
            currentValue: true,
            briScore: true,
          },
        })

        return {
          ...client,
          company,
          valuation: latestSnapshot ? {
            currentValue: Number(latestSnapshot.currentValue),
            briScore: Number(latestSnapshot.briScore),
          } : null,
        }
      })
    )

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      advisorProfile: user.advisorProfile,
      clients: enrichedClients,
      clientCount: enrichedClients.length,
    })
  } catch (error) {
    console.error('Failed to get advisor clients:', error)
    return NextResponse.json(
      { error: 'Failed to get advisor clients' },
      { status: 500 }
    )
  }
}
