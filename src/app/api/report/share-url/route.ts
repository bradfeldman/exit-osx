import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateReportToken } from '@/lib/report-token'
import { z } from 'zod'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

const postSchema = z.object({
  companyId: uuidSchema,
})

/**
 * Authenticated endpoint to generate a shareable report URL for a company.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { companyId } = validation.data

  // Verify user has access to this company
  const member = await prisma.workspaceMember.findFirst({
    where: {
      user: { authId: user.id },
      workspace: { companies: { some: { id: companyId } } },
    },
  })

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const token = generateReportToken(companyId)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const url = `${baseUrl}/report/${token}`

  return NextResponse.json({ url, token })
}
