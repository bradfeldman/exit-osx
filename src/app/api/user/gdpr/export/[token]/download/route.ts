import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Download exported data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { token } = await params

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the export request
    const exportRequest = await prisma.dataExportRequest.findFirst({
      where: {
        downloadToken: token,
        userId: dbUser.id,
      },
    })

    if (!exportRequest) {
      return NextResponse.json(
        { error: 'Export not found' },
        { status: 404 }
      )
    }

    if (exportRequest.status !== 'READY') {
      return NextResponse.json(
        { error: `Export is not ready. Status: ${exportRequest.status}` },
        { status: 400 }
      )
    }

    if (exportRequest.expiresAt && new Date() > exportRequest.expiresAt) {
      await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: { status: 'EXPIRED' },
      })
      return NextResponse.json(
        { error: 'Export has expired' },
        { status: 410 }
      )
    }

    // Regenerate the export data (in production, would fetch from storage)
    const exportData = await generateExportData(dbUser.id, {
      includeProfile: exportRequest.includeProfile,
      includeCompanies: exportRequest.includeCompanies,
      includeAssessments: exportRequest.includeAssessments,
      includeDocuments: exportRequest.includeDocuments,
    })

    // Update download count
    await prisma.dataExportRequest.update({
      where: { id: exportRequest.id },
      data: {
        downloadCount: { increment: 1 },
        downloadedAt: new Date(),
      },
    })

    // Return as downloadable JSON file
    const jsonData = JSON.stringify(exportData, null, 2)

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="exitosx-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error downloading export:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to download export' },
      { status: 500 }
    )
  }
}

// Helper function to generate export data
async function generateExportData(
  userId: string,
  options: {
    includeProfile: boolean
    includeCompanies: boolean
    includeAssessments: boolean
    includeDocuments: boolean
  }
) {
  const exportData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    gdprNotice: 'This data export was generated in compliance with GDPR Article 20 (Right to Data Portability).',
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
            workspaceRole: true,
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
        consents: {
          select: {
            consentType: true,
            action: true,
            version: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
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
        coreFactors: {
          select: {
            revenueSizeCategory: true,
            revenueModel: true,
            grossMarginProxy: true,
            laborIntensity: true,
            assetIntensity: true,
            ownerInvolvement: true,
          },
        },
        ebitdaAdjustments: {
          select: {
            description: true,
            amount: true,
            type: true,
            frequency: true,
            createdAt: true,
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
            label: true,
            incomeStatement: {
              select: {
                grossRevenue: true,
                cogs: true,
                operatingExpenses: true,
                grossProfit: true,
                grossMarginPct: true,
                ebitda: true,
                ebitdaMarginPct: true,
              },
            },
            balanceSheet: {
              select: {
                cash: true,
                accountsReceivable: true,
                inventory: true,
                totalAssets: true,
                totalLiabilities: true,
                totalEquity: true,
                workingCapital: true,
              },
            },
          },
        },
        tasks: {
          select: {
            title: true,
            description: true,
            status: true,
            dueDate: true,
            completedAt: true,
            completionNotes: true,
            briCategory: true,
            effortLevel: true,
            complexity: true,
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
      select: { id: true, name: true },
    })
    const companyMap = new Map(companies.map((c) => [c.id, c.name]))
    const companyIds = companies.map((c) => c.id)

    const assessments = await prisma.assessment.findMany({
      where: {
        companyId: { in: companyIds },
      },
      select: {
        companyId: true,
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

    // Add company names to assessments
    const assessmentsWithNames = assessments.map((a) => ({
      ...a,
      companyName: companyMap.get(a.companyId),
    }))

    const valuationSnapshots = await prisma.valuationSnapshot.findMany({
      where: {
        companyId: { in: companyIds },
      },
      select: {
        companyId: true,
        adjustedEbitda: true,
        briScore: true,
        briFinancial: true,
        briTransferability: true,
        briOperational: true,
        briMarket: true,
        briLegalTax: true,
        briPersonal: true,
        currentValue: true,
        potentialValue: true,
        valueGap: true,
        finalMultiple: true,
        createdAt: true,
        snapshotReason: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const snapshotsWithNames = valuationSnapshots.map((s) => ({
      ...s,
      companyName: companyMap.get(s.companyId),
    }))

    exportData.assessments = assessmentsWithNames
    exportData.valuationHistory = snapshotsWithNames
  }

  return exportData
}
