import { prisma } from '@/lib/prisma'
import type { IdentitySection } from '../types'

export async function buildIdentitySection(companyId: string): Promise<IdentitySection> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    include: { coreFactors: true },
  })

  return {
    name: company.name,
    industry: company.icbIndustry,
    subSector: company.icbSubSector,
    businessDescription: company.businessDescription,
    coreFactors: company.coreFactors
      ? {
          revenueModel: company.coreFactors.revenueModel,
          ownerInvolvement: company.coreFactors.ownerInvolvement,
          laborIntensity: company.coreFactors.laborIntensity,
          assetIntensity: company.coreFactors.assetIntensity,
          grossMarginProxy: company.coreFactors.grossMarginProxy,
          revenueSizeCategory: company.coreFactors.revenueSizeCategory,
        }
      : null,
  }
}
