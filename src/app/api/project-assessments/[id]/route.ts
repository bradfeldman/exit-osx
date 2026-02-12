/**
 * Project Assessment Detail API
 *
 * GET /api/project-assessments/[id] - Get a specific Project Assessment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/project-assessments/[id]
 * Get a specific Project Assessment with its questions and responses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params

  // Get the assessment with questions and responses
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        include: {
          question: {
            include: {
              options: {
                orderBy: { displayOrder: 'asc' }
              }
            }
          }
        },
        orderBy: { displayOrder: 'asc' }
      },
      responses: {
        select: {
          questionId: true,
          selectedOptionId: true,
        }
      }
    }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  // Verify user has access to this company
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      workspaces: {
        include: {
          workspace: {
            include: { companies: { where: { id: assessment.companyId } } }
          }
        }
      }
    }
  })

  const hasAccess = dbUser?.workspaces.some(
    ws => ws.workspace.companies.length > 0
  )

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ assessment })
}
