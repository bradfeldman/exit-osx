import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getUserAccessibleCompanies } from '@/lib/access'
import { createClient } from '@/lib/supabase/server'
import { serverAnalytics } from '@/lib/analytics/server'
import { COMPANY_LIMITS, type PlanTier } from '@/lib/pricing'
import { createOnboardingAlerts } from '@/lib/alerts'
import { z } from 'zod'
import { validateRequestBody, shortText, financialAmount, optionalFinancialAmount } from '@/lib/security/validation'
import type { Prisma } from '@prisma/client'

/** Typed error for company limit enforcement within serializable transactions */
class CompanyLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyLimitError'
  }
}

export async function GET() {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Get active (non-deleted) companies from the user's workspace (legacy)
    const workspaceCompanies = await prisma.company.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted companies
        workspace: {
          members: {
            some: { userId: auth.user.id }
          }
        }
      },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true,
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    // Get company access roles for the user
    const accessibleCompanies = await getUserAccessibleCompanies(auth.user.id)

    // Merge role info into companies
    const companies = workspaceCompanies.map(company => {
      const accessInfo = accessibleCompanies.find(c => c.id === company.id)
      return {
        ...company,
        role: accessInfo?.role,
        isSubscribingOwner: accessInfo?.isSubscribingOwner,
        ownershipPercent: accessInfo?.ownershipPercent,
      }
    })

    // Also include companies from new ownership model that might not be in workspace
    for (const accessCompany of accessibleCompanies) {
      if (!companies.some(c => c.id === accessCompany.id)) {
        const company = await prisma.company.findUnique({
          where: { id: accessCompany.id },
          include: {
            coreFactors: true,
            ebitdaAdjustments: true,
            valuationSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
        if (company && !company.deletedAt) {
          companies.push({
            ...company,
            role: accessCompany.role,
            isSubscribingOwner: accessCompany.isSubscribingOwner,
            ownershipPercent: accessCompany.ownershipPercent,
          })
        }
      }
    }

    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Error fetching companies:', error instanceof Error ? error.message : String(error))
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

const companyCreateSchema = z.object({
  name: shortText.min(1),
  icbIndustry: shortText.min(1),
  icbSuperSector: shortText.min(1),
  icbSector: shortText.min(1),
  icbSubSector: shortText.min(1),
  annualRevenue: optionalFinancialAmount,
  annualEbitda: optionalFinancialAmount,
  ownerCompensation: financialAmount.default(0),
  businessDescription: z.string().max(5000).optional(),
  businessProfile: z.object({
    businessType: z.string().max(200),
    cuisine: z.string().max(200).optional(),
    locationType: z.string().max(200).optional(),
    seatingCapacity: z.number().int().min(0).max(100000).optional(),
    team: z.object({
      total: z.number().int().min(0).max(100000),
      ownerWorking: z.boolean(),
      fullTime: z.number().int().min(0).max(100000),
      partTime: z.number().int().min(0).max(100000),
      keyRoles: z.array(z.string().max(200)).max(50),
    }),
    services: z.array(z.string().max(500)).max(100),
    hours: z.string().max(500).optional(),
    techStack: z.object({
      pos: z.string().max(200).optional(),
      inventory: z.string().max(200).optional(),
      scheduling: z.string().max(200).optional(),
      delivery: z.string().max(200).optional(),
    }).optional(),
    yearsInBusiness: z.number().int().min(0).max(500).optional(),
    painPoints: z.array(z.string().max(500)).max(50),
    documentationLevel: z.enum(['none', 'minimal', 'partial', 'good', 'excellent']),
    ownerDependency: z.enum(['critical', 'high', 'moderate', 'low']),
    primaryGoal: z.string().max(1000),
    constraints: z.array(z.string().max(500)).max(50),
    uniqueFactors: z.array(z.string().max(500)).max(50),
  }).optional(),
  profileQuestionsAnswered: z.boolean().optional(),
})

export async function POST(request: Request) {
  // First, check if user is authenticated
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in' },
      { status: 401 }
    )
  }

  const validation = await validateRequestBody(request, companyCreateSchema)
  if (!validation.success) return validation.error

  const {
    name,
    icbIndustry,
    icbSuperSector,
    icbSector,
    icbSubSector,
    annualRevenue,
    annualEbitda,
    ownerCompensation,
    businessDescription,
    businessProfile,
    profileQuestionsAnswered,
  } = validation.data

  try {

    // Get the user from our database
    const dbUser = await prisma.user.findUnique({
      where: { authId: supabaseUser.id },
      include: {
        workspaces: {
          include: { workspace: true }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find a workspace where user has OWNER or ADMIN role (can create companies)
    let targetWorkspace = dbUser.workspaces.find(
      wm => wm.workspaceRole === 'OWNER' || wm.workspaceRole === 'ADMIN'
    )

    // If user doesn't have a workspace where they can create companies, create one for them
    if (!targetWorkspace) {
      // Create a new personal workspace for this user
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: dbUser.name
            ? `${dbUser.name}'s Workspace`
            : 'My Workspace',
          planTier: 'FOUNDATION',
          subscriptionStatus: 'ACTIVE',
          members: {
            create: {
              userId: dbUser.id,
              workspaceRole: 'OWNER',
            }
          }
        }
      })

      // Fetch the workspace member relationship we just created
      const newWorkspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: newWorkspace.id,
          userId: dbUser.id,
        },
        include: { workspace: true }
      })

      if (!newWorkspaceMember) {
        throw new Error('Failed to create workspace membership')
      }

      targetWorkspace = newWorkspaceMember
    }

    // Enforce company limit based on workspace plan tier
    const workspacePlanTier = targetWorkspace.workspace
      ? targetWorkspace.workspace.planTier.toLowerCase().replace('_', '-') as PlanTier
      : 'foundation' as PlanTier
    const companyLimit = COMPANY_LIMITS[workspacePlanTier] ?? 1

    // =========================================================================
    // SERIALIZABLE TRANSACTION: Count check + company creation + ownership.
    // Serializable isolation prevents TOCTOU race where two concurrent requests
    // both pass the limit check and create companies exceeding the plan limit.
    // =========================================================================
    let company: Awaited<ReturnType<typeof prisma.company.create>>

    try {
      company = await prisma.$transaction(async (tx) => {
        const activeCompanyCount = await tx.company.count({
          where: {
            workspaceId: targetWorkspace.workspaceId,
            deletedAt: null,
          },
        })

        if (activeCompanyCount >= companyLimit) {
          throw new CompanyLimitError('Company limit reached for your plan')
        }

        // Create the company in the target workspace
        const createData: Prisma.CompanyCreateInput = {
          workspace: { connect: { id: targetWorkspace.workspaceId } },
          name,
          icbIndustry,
          icbSuperSector,
          icbSector,
          icbSubSector,
          annualRevenue: annualRevenue ?? 0,
          annualEbitda: annualEbitda ?? 0,
          ownerCompensation,
        }
        if (businessDescription) createData.businessDescription = businessDescription
        if (businessProfile) createData.businessProfile = businessProfile
        if (profileQuestionsAnswered !== undefined) createData.profileQuestionsAnswered = profileQuestionsAnswered

        const newCompany = await tx.company.create({
          data: createData,
          include: {
            coreFactors: true,
            ebitdaAdjustments: true
          }
        })

        // Create company ownership record - creator becomes subscribing owner
        await tx.companyOwnership.create({
          data: {
            companyId: newCompany.id,
            userId: dbUser.id,
            isSubscribingOwner: true,
            ownershipPercent: 100,
            status: 'ACTIVE',
          }
        })

        return newCompany
      }, {
        isolationLevel: 'Serializable',
      })
    } catch (error) {
      if (error instanceof CompanyLimitError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
      throw error // Re-throw to be caught by outer catch block
    }

    // Track company created (non-blocking, outside transaction)
    serverAnalytics.company.created({
      userId: dbUser.id,
      companyId: company.id,
      industry: icbSubSector,
    }).catch(() => {})

    // Create onboarding alerts for new users (non-blocking)
    createOnboardingAlerts(dbUser.id).catch((err) =>
      console.error('Failed to create onboarding alerts:', err instanceof Error ? err.message : String(err))
    )

    return NextResponse.json({
      company: {
        ...company,
        role: 'subscribing_owner',
        isSubscribingOwner: true,
        ownershipPercent: 100,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error instanceof Error ? error.message : String(error))
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
