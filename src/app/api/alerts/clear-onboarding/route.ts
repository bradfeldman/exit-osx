import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { clearOnboardingAlert } from '@/lib/alerts'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  type: z.enum(['ONBOARDING_TOUR', 'ONBOARDING_ASSESSMENT']),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { type } = validation.data

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await clearOnboardingAlert(dbUser.id, type)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing onboarding alert:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to clear alert' },
      { status: 500 }
    )
  }
}
