import { prisma } from '@/lib/prisma'
import { PlanTier, canAccessFeature as canAccessPlanFeature, TEAM_MEMBER_LIMITS } from '@/lib/pricing'
import { UserType, CompanyMemberStatus, PlanTier as PrismaPlanTier } from '@prisma/client'

// Personal features that require owner status or explicit grant
export const PERSONAL_FEATURES = ['personal-financials', 'retirement-calculator', 'business-loans'] as const
export type PersonalFeature = typeof PERSONAL_FEATURES[number]

// Feature key to staff access field mapping
const FEATURE_TO_STAFF_FIELD: Record<PersonalFeature, 'hasPFSAccess' | 'hasRetirementAccess' | 'hasLoansAccess'> = {
  'personal-financials': 'hasPFSAccess',
  'retirement-calculator': 'hasRetirementAccess',
  'business-loans': 'hasLoansAccess',
}

// Comped email domains that get full Deal Room access
const COMPED_DOMAINS = ['pasadena-private.com', 'pasadenapw.com']

export interface CompanyWithRole {
  id: string
  name: string
  role: 'subscribing_owner' | 'owner' | 'staff'
  isSubscribingOwner: boolean
  ownershipPercent?: number
  status: CompanyMemberStatus
}

export interface UserAccessInfo {
  userId: string
  userType: UserType
  companyId: string
  role: 'subscribing_owner' | 'owner' | 'staff'
  planTier: PlanTier
  staffAccess?: {
    hasPFSAccess: boolean
    hasRetirementAccess: boolean
    hasLoansAccess: boolean
  }
}

/**
 * Determine user type based on email domain
 */
export function determineUserType(email: string): UserType {
  const domain = email.split('@')[1]?.toLowerCase()
  return COMPED_DOMAINS.includes(domain) ? 'COMPED' : 'SUBSCRIBER'
}

/**
 * Check if an email domain grants COMPED status
 */
export function isCompedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return COMPED_DOMAINS.includes(domain)
}

/**
 * Convert Prisma PlanTier to lowercase pricing PlanTier
 */
function toPricingPlanTier(tier: PrismaPlanTier): PlanTier {
  return tier.toLowerCase().replace('_', '-') as PlanTier
}

/**
 * Get the subscribing owner of a company
 */
export async function getCompanySubscribingOwner(companyId: string) {
  const ownership = await prisma.companyOwnership.findFirst({
    where: {
      companyId,
      isSubscribingOwner: true,
    },
    include: {
      user: true,
    },
  })

  return ownership?.user ?? null
}

/**
 * Check if a user is any type of owner of a company
 */
export async function isUserCompanyOwner(userId: string, companyId: string): Promise<boolean> {
  const ownership = await prisma.companyOwnership.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  return ownership !== null && ownership.status === 'ACTIVE'
}

/**
 * Check if a user is the subscribing owner of a company
 */
export async function isUserSubscribingOwner(userId: string, companyId: string): Promise<boolean> {
  const ownership = await prisma.companyOwnership.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  return ownership?.isSubscribingOwner === true && ownership.status === 'ACTIVE'
}

/**
 * Check if a user can access a company (as owner, staff, company member, or workspace member)
 *
 * Phase 3 — Dual-Read: CompanyMember is checked as an additional access path.
 * Access is granted if ANY of these conditions are met:
 * 1. Active CompanyOwnership record
 * 2. Active CompanyStaffAccess record
 * 3. CompanyMember record (new model — any role grants access)
 * 4. WorkspaceMember membership in the company's workspace
 */
export async function canUserAccessCompany(userId: string, companyId: string): Promise<boolean> {
  // Check ownership
  const ownership = await prisma.companyOwnership.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (ownership && ownership.status === 'ACTIVE') {
    return true
  }

  // Check staff access (company-level)
  const staffAccess = await prisma.companyStaffAccess.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (staffAccess && staffAccess.status === 'ACTIVE') {
    return true
  }

  // Check CompanyMember (new model — Phase 3 dual-read)
  const companyMember = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (companyMember) {
    return true
  }

  // Check workspace membership
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspaceId: true },
  })

  if (company) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: company.workspaceId,
          userId,
        },
      },
    })

    if (workspaceMember) {
      return true
    }
  }

  return false
}

/**
 * Get the plan tier for a company based on the subscribing owner's subscription
 */
export async function getCompanyPlanTier(companyId: string): Promise<PlanTier> {
  // First check if subscribing owner is COMPED
  const subscribingOwner = await getCompanySubscribingOwner(companyId)

  if (subscribingOwner?.userType === 'COMPED') {
    return 'deal-room'
  }

  // Get the company to find its workspace
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      workspace: true,
    },
  })

  if (!company) {
    return 'foundation'
  }

  // Use workspace's plan tier (this maintains backward compatibility)
  return toPricingPlanTier(company.workspace.planTier)
}

/**
 * Check if a user can access a company-level feature
 * Company features are accessible based on the subscribing owner's plan
 */
export async function canAccessCompanyFeature(
  userId: string,
  companyId: string,
  feature: string
): Promise<boolean> {
  // First check user has access to the company
  if (!(await canUserAccessCompany(userId, companyId))) {
    return false
  }

  // Get the company's effective plan tier
  const planTier = await getCompanyPlanTier(companyId)

  // Check if the plan includes this feature
  return canAccessPlanFeature(planTier, feature)
}

/**
 * Check if a user can access a personal feature (PFS, Retirement, Loans)
 * Personal features require:
 * 1. Being an owner of the company, OR
 * 2. Being staff with the specific feature grant, OR
 * 3. Being a workspace member with the specific permission grant
 */
export async function canAccessPersonalFeature(
  userId: string,
  companyId: string,
  feature: string
): Promise<boolean> {
  // First verify it's actually a personal feature
  if (!isPersonalFeature(feature)) {
    // Not a personal feature, use regular company feature check
    return canAccessCompanyFeature(userId, companyId, feature)
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  // COMPED users always have access
  if (user?.userType === 'COMPED') {
    return true
  }

  // Check if user is an owner
  const ownership = await prisma.companyOwnership.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (ownership && ownership.status === 'ACTIVE') {
    // Owners have access to personal features if plan tier supports them
    const planTier = await getCompanyPlanTier(companyId)
    return canAccessPlanFeature(planTier, feature)
  }

  // Check staff access with feature grant (company-level)
  const staffAccess = await prisma.companyStaffAccess.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (staffAccess && staffAccess.status === 'ACTIVE') {
    // Check if the company's plan includes this feature
    const planTier = await getCompanyPlanTier(companyId)
    if (!canAccessPlanFeature(planTier, feature)) {
      return false
    }

    // Check if staff has been granted this specific feature
    const fieldKey = FEATURE_TO_STAFF_FIELD[feature as PersonalFeature]
    return staffAccess[fieldKey] === true
  }

  // Check workspace membership with permission grants
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspaceId: true },
  })

  if (company) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: company.workspaceId,
          userId,
        },
      },
      include: {
        customPermissions: true,
      },
    })

    if (workspaceMember) {
      // Check if the company's plan includes this feature
      const planTier = await getCompanyPlanTier(companyId)
      if (!canAccessPlanFeature(planTier, feature)) {
        return false
      }

      // Map feature to granular permission pattern
      const permissionPatterns: Record<PersonalFeature, string[]> = {
        'personal-financials': ['personal.net_worth:view', 'personal.net_worth:edit'],
        'retirement-calculator': ['personal.retirement:view', 'personal.retirement:edit'],
        'business-loans': ['personal.net_worth:view', 'personal.net_worth:edit'], // Loans is part of PFS
      }

      const patterns = permissionPatterns[feature as PersonalFeature]
      return workspaceMember.customPermissions.some(
        p => p.granted && patterns.includes(p.permission)
      )
    }
  }

  return false
}

/**
 * Check if a feature is a personal feature
 */
export function isPersonalFeature(feature: string): feature is PersonalFeature {
  return PERSONAL_FEATURES.includes(feature as PersonalFeature)
}

/**
 * Get list of personal features
 */
export function getPersonalFeatures(): readonly string[] {
  return PERSONAL_FEATURES
}

/**
 * Get all companies a user can access with their role info
 *
 * Phase 3: Also queries CompanyMember records for additional company access.
 */
export async function getUserAccessibleCompanies(userId: string): Promise<CompanyWithRole[]> {
  // Get owned companies
  const ownerships = await prisma.companyOwnership.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      company: true,
    },
  })

  // Get staff access companies (company-level)
  const staffAccess = await prisma.companyStaffAccess.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      company: true,
    },
  })

  // Get CompanyMember records (new model — Phase 3)
  const companyMembers = await prisma.companyMember.findMany({
    where: {
      userId,
    },
    include: {
      company: true,
    },
  })

  // Get companies from workspaces the user is a member of
  const workspaceMemberships = await prisma.workspaceMember.findMany({
    where: {
      userId,
    },
    include: {
      workspace: {
        include: {
          companies: true,
        },
      },
    },
  })

  const companies: CompanyWithRole[] = []

  // Add owned companies
  for (const ownership of ownerships) {
    if (ownership.company.deletedAt) continue

    companies.push({
      id: ownership.company.id,
      name: ownership.company.name,
      role: ownership.isSubscribingOwner ? 'subscribing_owner' : 'owner',
      isSubscribingOwner: ownership.isSubscribingOwner,
      ownershipPercent: ownership.ownershipPercent?.toNumber(),
      status: ownership.status,
    })
  }

  // Add staff companies (if not already added as owner)
  for (const access of staffAccess) {
    if (access.company.deletedAt) continue
    if (companies.some(c => c.id === access.company.id)) continue

    companies.push({
      id: access.company.id,
      name: access.company.name,
      role: 'staff',
      isSubscribingOwner: false,
      status: access.status,
    })
  }

  // Add CompanyMember companies (if not already added via ownership/staff)
  for (const member of companyMembers) {
    if (member.company.deletedAt) continue
    if (companies.some(c => c.id === member.company.id)) continue

    // Map CompanyRole to the legacy role concept for backward compatibility
    // LEAD members are treated as owners, CONTRIBUTOR/VIEWER as staff
    const role = member.role === 'LEAD' ? 'owner' : 'staff'

    companies.push({
      id: member.company.id,
      name: member.company.name,
      role,
      isSubscribingOwner: false,
      status: 'ACTIVE',
    })
  }

  // Add workspace member companies (if not already added)
  for (const membership of workspaceMemberships) {
    for (const company of membership.workspace.companies) {
      if (company.deletedAt) continue
      if (companies.some(c => c.id === company.id)) continue

      companies.push({
        id: company.id,
        name: company.name,
        role: 'staff', // Workspace members are treated as staff
        isSubscribingOwner: false,
        status: 'ACTIVE',
      })
    }
  }

  return companies.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Map granular permissions to personal feature access
 */
function mapPermissionsToStaffAccess(
  permissions: Array<{ permission: string; granted: boolean }>
): { hasPFSAccess: boolean; hasRetirementAccess: boolean; hasLoansAccess: boolean } {
  const hasPFSAccess = permissions.some(
    p => p.granted && (p.permission === 'personal.net_worth:view' || p.permission === 'personal.net_worth:edit')
  )
  const hasRetirementAccess = permissions.some(
    p => p.granted && (p.permission === 'personal.retirement:view' || p.permission === 'personal.retirement:edit')
  )
  // Business loans uses personal.net_worth permissions as it's part of the PFS module
  const hasLoansAccess = hasPFSAccess

  return { hasPFSAccess, hasRetirementAccess, hasLoansAccess }
}

/**
 * Get user's access info for a specific company
 *
 * Phase 3: Also checks CompanyMember as an access path between staff and org membership.
 */
export async function getUserAccessInfo(
  userId: string,
  companyId: string
): Promise<UserAccessInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return null

  // Check ownership first
  const ownership = await prisma.companyOwnership.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (ownership && ownership.status === 'ACTIVE') {
    const planTier = await getCompanyPlanTier(companyId)
    return {
      userId,
      userType: user.userType,
      companyId,
      role: ownership.isSubscribingOwner ? 'subscribing_owner' : 'owner',
      planTier,
    }
  }

  // Check staff access (company-level)
  const staffAccess = await prisma.companyStaffAccess.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (staffAccess && staffAccess.status === 'ACTIVE') {
    const planTier = await getCompanyPlanTier(companyId)
    return {
      userId,
      userType: user.userType,
      companyId,
      role: 'staff',
      planTier,
      staffAccess: {
        hasPFSAccess: staffAccess.hasPFSAccess,
        hasRetirementAccess: staffAccess.hasRetirementAccess,
        hasLoansAccess: staffAccess.hasLoansAccess,
      },
    }
  }

  // Check CompanyMember (new model — Phase 3 dual-read)
  const companyMember = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  })

  if (companyMember) {
    const planTier = await getCompanyPlanTier(companyId)
    // Map CompanyRole to legacy role concept
    const role = companyMember.role === 'LEAD' ? 'owner' : 'staff'
    return {
      userId,
      userType: user.userType,
      companyId,
      role,
      planTier,
    }
  }

  // Check workspace membership (workspace-level staff via invite)
  // Get the company's workspace
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspaceId: true },
  })

  if (company) {
    // Check if user is a member of this workspace
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: company.workspaceId,
          userId,
        },
      },
      include: {
        customPermissions: true,
      },
    })

    if (workspaceMember) {
      const planTier = await getCompanyPlanTier(companyId)
      // Map MemberPermission to staffAccess format
      const memberStaffAccess = mapPermissionsToStaffAccess(workspaceMember.customPermissions)

      return {
        userId,
        userType: user.userType,
        companyId,
        role: 'staff', // Workspace members who aren't owners are treated as staff
        planTier,
        staffAccess: memberStaffAccess,
      }
    }
  }

  return null
}

/**
 * Check if more staff can be invited to a company
 */
export async function checkCanInviteStaff(companyId: string): Promise<{ allowed: boolean; reason?: string }> {
  const planTier = await getCompanyPlanTier(companyId)
  const limit = TEAM_MEMBER_LIMITS[planTier]

  if (limit === Infinity) {
    return { allowed: true }
  }

  // Count current active staff
  const staffCount = await prisma.companyStaffAccess.count({
    where: {
      companyId,
      status: 'ACTIVE',
    },
  })

  if (staffCount >= limit) {
    return {
      allowed: false,
      reason: `Staff limit reached (${limit} for ${planTier} plan)`,
    }
  }

  return { allowed: true }
}

/**
 * Check if more guest owners can be invited to a company
 */
export async function checkCanInviteOwner(companyId: string): Promise<{ allowed: boolean; reason?: string }> {
  const planTier = await getCompanyPlanTier(companyId)

  // Guest owners only available on Deal Room
  if (planTier !== 'deal-room') {
    return {
      allowed: false,
      reason: 'Guest owners are only available on the Deal Room plan',
    }
  }

  // Count current non-subscribing owners
  const ownerCount = await prisma.companyOwnership.count({
    where: {
      companyId,
      isSubscribingOwner: false,
      status: 'ACTIVE',
    },
  })

  const limit = 10 // Deal Room allows 10 guest owners
  if (ownerCount >= limit) {
    return {
      allowed: false,
      reason: `Guest owner limit reached (${limit} maximum)`,
    }
  }

  return { allowed: true }
}

/**
 * Get count of active staff for a company
 */
export async function getCompanyStaffCount(companyId: string): Promise<number> {
  return prisma.companyStaffAccess.count({
    where: {
      companyId,
      status: 'ACTIVE',
    },
  })
}

/**
 * Get count of guest owners for a company
 */
export async function getCompanyGuestOwnerCount(companyId: string): Promise<number> {
  return prisma.companyOwnership.count({
    where: {
      companyId,
      isSubscribingOwner: false,
      status: 'ACTIVE',
    },
  })
}
