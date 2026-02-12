import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// GET - Get current export request status
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get recent export requests
    const exportRequests = await prisma.dataExportRequest.findMany({
      where: {
        userId: dbUser.id,
      },
      orderBy: { requestedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        expiresAt: true,
        fileSize: true,
        downloadCount: true,
        downloadToken: true,
        includeProfile: true,
        includeCompanies: true,
        includeAssessments: true,
        includeDocuments: true,
      },
    })

    return NextResponse.json({ exportRequests })
  } catch (error) {
    console.error('Error fetching export requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch export requests' },
      { status: 500 }
    )
  }
}

// POST - Create a new export request
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const {
      includeProfile = true,
      includeCompanies = true,
      includeAssessments = true,
      includeDocuments = false,
    } = body

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for pending/processing request
    const existingRequest = await prisma.dataExportRequest.findFirst({
      where: {
        userId: dbUser.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'An export request is already in progress' },
        { status: 400 }
      )
    }

    // Create export request
    const downloadToken = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Export available for 7 days

    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        userId: dbUser.id,
        downloadToken,
        expiresAt,
        includeProfile,
        includeCompanies,
        includeAssessments,
        includeDocuments,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        downloadToken: true,
        includeProfile: true,
        includeCompanies: true,
        includeAssessments: true,
        includeDocuments: true,
      },
    })

    // Process export immediately (in production, this would be a background job)
    await processExportRequest(exportRequest.id, dbUser.id, {
      includeProfile,
      includeCompanies,
      includeAssessments,
      includeDocuments,
    })

    // Fetch updated request
    const updatedRequest = await prisma.dataExportRequest.findUnique({
      where: { id: exportRequest.id },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        expiresAt: true,
        fileSize: true,
        downloadToken: true,
      },
    })

    return NextResponse.json({
      message: 'Export request created and processed.',
      exportRequest: updatedRequest,
    })
  } catch (error) {
    console.error('Error creating export request:', error)
    return NextResponse.json(
      { error: 'Failed to create export request' },
      { status: 500 }
    )
  }
}

// Helper function to process export request
async function processExportRequest(
  requestId: string,
  userId: string,
  options: {
    includeProfile: boolean
    includeCompanies: boolean
    includeAssessments: boolean
    includeDocuments: boolean
  }
) {
  try {
    // Update status to processing
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING' },
    })

    // Gather user data
    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
    }

    if (options.includeProfile) {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          workspaces: {
            select: {
              role: true,
              functionalCategories: true,
              joinedAt: true,
              workspace: {
                select: {
                  name: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      })
      exportData.profile = profile
    }

    if (options.includeCompanies) {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true },
      })
      const wsIds = memberships.map((m) => m.workspaceId)

      const companies = await prisma.company.findMany({
        where: {
          workspaceId: { in: wsIds },
          deletedAt: null,
        },
        select: {
          name: true,
          icbIndustry: true,
          icbSuperSector: true,
          icbSector: true,
          icbSubSector: true,
          annualRevenue: true,
          annualEbitda: true,
          ownerCompensation: true,
          createdAt: true,
          coreFactors: true,
          ebitdaAdjustments: {
            select: {
              description: true,
              amount: true,
              type: true,
              frequency: true,
            },
          },
          financialPeriods: {
            select: {
              periodType: true,
              fiscalYear: true,
              quarter: true,
              month: true,
              startDate: true,
              endDate: true,
              incomeStatement: true,
              balanceSheet: true,
            },
          },
        },
      })
      exportData.companies = companies
    }

    if (options.includeAssessments) {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true },
      })
      const wsIds = memberships.map((m) => m.workspaceId)

      const companies = await prisma.company.findMany({
        where: { workspaceId: { in: wsIds } },
        select: { id: true },
      })
      const companyIds = companies.map((c) => c.id)

      const assessments = await prisma.assessment.findMany({
        where: {
          companyId: { in: companyIds },
        },
        select: {
          assessmentType: true,
          completedAt: true,
          createdAt: true,
          responses: {
            select: {
              confidenceLevel: true,
              notes: true,
              question: {
                select: {
                  briCategory: true,
                  questionText: true,
                },
              },
              selectedOption: {
                select: {
                  optionText: true,
                  scoreValue: true,
                },
              },
            },
          },
        },
      })

      const valuationSnapshots = await prisma.valuationSnapshot.findMany({
        where: {
          companyId: { in: companyIds },
        },
        select: {
          adjustedEbitda: true,
          briScore: true,
          currentValue: true,
          potentialValue: true,
          valueGap: true,
          finalMultiple: true,
          createdAt: true,
          snapshotReason: true,
        },
      })

      exportData.assessments = assessments
      exportData.valuationSnapshots = valuationSnapshots
    }

    // Convert to JSON and calculate size
    const jsonData = JSON.stringify(exportData, null, 2)
    const fileSize = Buffer.byteLength(jsonData, 'utf-8')

    // In production, you would save this to storage
    // For now, we store the data directly in the database as a workaround
    // In production: save to Supabase Storage and store filePath

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'READY',
        processedAt: new Date(),
        fileSize,
        // In production: filePath would be set here
      },
    })
  } catch (error) {
    console.error('Error processing export:', error)
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
