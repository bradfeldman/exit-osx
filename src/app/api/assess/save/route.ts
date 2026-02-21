import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase/server'
import {
  RevenueSizeCategory,
  RevenueModelType,
  LaborIntensityLevel,
  AssetIntensityLevel,
  OwnerInvolvementLevel,
  GrossMarginCategory,
} from '@prisma/client'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'
import { validateRequestBody, assessSaveSchema } from '@/lib/security/validation'
import { ALPHA, calculateCoreScore, calculateValuationV2, type CoreFactors } from '@/lib/valuation/calculate-valuation'
import { estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { getOrResearchMultiples } from '@/lib/valuation/multiple-freshness'
import { classifyBusiness } from '@/lib/ai/business-classifier'
import { getMarketSalary } from '@/lib/valuation/recalculate-snapshot'
import { calculateBusinessQualityScore, buildAdjustmentProfile } from '@/lib/valuation/business-quality-score'
import { calculateDealReadinessScore } from '@/lib/valuation/deal-readiness-score'
import { calculateRiskDiscounts, type RiskDiscountInputs } from '@/lib/valuation/risk-discounts'
import { calculateValueGapV2 } from '@/lib/valuation/value-gap-v2'

/**
 * POST /api/assess/save
 *
 * Public endpoint that creates a user account + company + assessment snapshot
 * from the public /assess flow data. Sends a magic link email for verification.
 *
 * SECURITY NOTE (SEC-098): No CAPTCHA. Rate limiting (AUTH: 5/min) is baseline
 * protection. TODO: Add Cloudflare Turnstile before next marketing launch.
 */
export async function POST(request: Request) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AUTH)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  // SEC-035: Zod validation with enum checking for profile fields
  const validation = await validateRequestBody(request, assessSaveSchema)
  if (!validation.success) return validation.error

  const body = validation.data
  const { email, password, basics, profile, results } = body
  const normalizedEmail = email

  // Convert revenue band to dollar midpoint for valuation calculations
  const BAND_MIDPOINTS: Record<string, number> = {
    UNDER_1M: 500_000, '1M_3M': 2_000_000, '3M_5M': 4_000_000,
    '5M_10M': 7_500_000, '10M_25M': 17_500_000, '25M_50M': 37_500_000, '50M_PLUS': 75_000_000,
  }
  const annualRevenue = BAND_MIDPOINTS[basics.revenueBand] || 2_000_000

  try {
    const adminClient = createServiceClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'

    // Create user via Supabase admin API (email_confirm: true so magic link works)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        selected_plan: 'foundation',
        signup_method: 'assess_flow',
      },
    })

    if (authError) {
      // Handle existing user
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in instead.' },
          { status: 409 }
        )
      }
      console.error('[assess/save] Auth error:', authError.message)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    const authId = authData.user.id

    // Generate magic link for login convenience email
    let magicLinkStatus = 'pending'
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    })

    if (linkError) {
      console.error('[assess/save] generateLink error:', linkError.message)
      magicLinkStatus = `generateLink_error: ${linkError.message}`
    }

    // Send branded login email if we have a link
    if (linkData?.properties?.hashed_token) {
      const verifyType = linkData.properties.verification_type || 'magiclink'
      const magicLinkUrl = `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=${verifyType}&next=/dashboard`

      try {
        const { sendWelcomeEmail } = await import('@/lib/email/send-welcome-email')
        const emailResult = await sendWelcomeEmail({
          email: normalizedEmail,
          magicLinkUrl,
          companyName: basics.companyName,
          briScore: body.scan.briScore,
          currentValue: results.currentValue,
        })
        if (emailResult.success) {
          magicLinkStatus = 'sent'
        } else {
          magicLinkStatus = `send_failed: ${emailResult.error}`
          console.error('[assess/save] Welcome email failed:', emailResult.error)
        }
      } catch (emailErr) {
        magicLinkStatus = `send_threw: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`
        console.error('[assess/save] Email send threw:', emailErr instanceof Error ? emailErr.message : String(emailErr))
      }
    } else if (!linkError) {
      magicLinkStatus = `no_token: ${JSON.stringify(linkData)}`
      console.error('[assess/save] No hashed_token from generateLink — linkData:', JSON.stringify(linkData))
    }

    // Classify the business server-side (don't rely on client classification)
    let classification: Awaited<ReturnType<typeof classifyBusiness>> | null = null
    try {
      classification = await classifyBusiness(basics.businessDescription, undefined, annualRevenue)
    } catch (err) {
      console.warn('[assess/save] Classification failed, using defaults:', err instanceof Error ? err.message : String(err))
    }

    const icbIndustry = classification?.primaryIndustry?.icbIndustry ?? 'Industrials'
    const icbSuperSector = classification?.primaryIndustry?.icbSuperSector ?? 'Industrial Goods and Services'
    const icbSector = classification?.primaryIndustry?.icbSector ?? 'Industrial Support Services'
    const icbSubSector = classification?.primaryIndustry?.icbSubSector ?? 'PROFESSIONAL_SERVICES'
    const gicsSubIndustry = classification?.gicsClassification?.subIndustry ?? null
    const gicsSector = classification?.gicsClassification?.sector ?? null
    const classificationMethod = classification?.classificationMethod ?? null
    const classificationConfidence = classification?.primaryIndustry?.confidence ?? null

    // Recalculate valuation inputs server-side (don't trust client values for storage)
    const coreScore = calculateCoreScore(profile as CoreFactors)
    const multiples = await getOrResearchMultiples(icbSubSector, gicsSubIndustry ?? undefined)
    const estimatedEbitda = estimateEbitdaFromRevenue(annualRevenue, multiples)
    const briScore = Math.max(0, Math.min(100, body.scan.briScore)) / 100
    const discountFraction = Math.pow(1 - briScore, ALPHA)

    // V2: Bidirectional owner comp (assess flow has ownerComp=0, so adjustment = 0 - marketSalary)
    // For the public /assess flow, we don't have owner compensation data, so we skip the adjustment
    const revenueSizeCategory = getRevenueSizeCategory(annualRevenue)
    const adjustedEbitda = estimatedEbitda // No owner comp adjustment in public assess flow

    // V2: Get category scores normalized to 0-1
    const categoryBreakdown = results.categoryBreakdown ?? {}
    const getCategoryScoreNormalized = (category: string): number => {
      const score = categoryBreakdown[category]
      return score !== undefined ? Math.max(0, Math.min(1, score)) : 0.7
    }

    // V2: Calculate three scores + valuation
    const transferabilityScore = getCategoryScoreNormalized('TRANSFERABILITY')

    const adjustmentProfile = buildAdjustmentProfile({
      annualRevenue: annualRevenue,
      annualEbitda: 0, // Not provided in assess flow
      coreFactors: {
        revenueSizeCategory,
        revenueModel: profile.revenueModel,
      },
      transferabilityScore,
    })

    const bqsResult = calculateBusinessQualityScore(adjustmentProfile)

    const drsCategoryScores = [
      { category: 'FINANCIAL', score: getCategoryScoreNormalized('FINANCIAL'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('FINANCIAL') },
      { category: 'TRANSFERABILITY', score: transferabilityScore, totalPoints: 1, earnedPoints: transferabilityScore },
      { category: 'OPERATIONAL', score: getCategoryScoreNormalized('OPERATIONAL'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('OPERATIONAL') },
      { category: 'MARKET', score: getCategoryScoreNormalized('MARKET'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('MARKET') },
      { category: 'LEGAL_TAX', score: getCategoryScoreNormalized('LEGAL_TAX'), totalPoints: 1, earnedPoints: getCategoryScoreNormalized('LEGAL_TAX') },
    ]
    const drsResult = calculateDealReadinessScore(drsCategoryScores)

    const riskInputs: RiskDiscountInputs = {
      ownerInvolvement: profile.ownerInvolvement ?? null,
      transferabilityScore,
      topCustomerConcentration: null,
      top3CustomerConcentration: null,
      legalTaxScore: getCategoryScoreNormalized('LEGAL_TAX'),
      financialScore: getCategoryScoreNormalized('FINANCIAL'),
      revenueSizeCategory,
    }
    const riskResult = calculateRiskDiscounts(riskInputs)

    const v2Valuation = calculateValuationV2({
      adjustedEbitda,
      industryMultipleLow: multiples.ebitdaMultipleLow,
      industryMultipleHigh: multiples.ebitdaMultipleHigh,
      qualityAdjustments: bqsResult.adjustments,
      riskDiscounts: riskResult.discounts,
      riskMultiplier: riskResult.riskMultiplier,
    })

    const sizeAdj = bqsResult.adjustments.adjustments.find(a => a.factor === 'size_discount')
    const sizeDiscountRate = sizeAdj?.impact ?? 0

    const gapResult = calculateValueGapV2({
      adjustedEbitda,
      industryMedianMultiple: v2Valuation.industryMedianMultiple,
      industryMultipleHigh: multiples.ebitdaMultipleHigh,
      qualityAdjustedMultiple: v2Valuation.qualityAdjustedMultiple,
      riskAdjustedMultiple: v2Valuation.riskAdjustedMultiple,
      riskDiscounts: riskResult.discounts,
      sizeDiscountRate,
    })

    const dlomDiscount = riskResult.discounts.find(d => d.name.includes('DLOM'))
    const dlomRate = dlomDiscount?.rate ?? 0
    const dlomAmount = v2Valuation.evMid > 0 ? v2Valuation.evMid * dlomRate / (1 - dlomRate) : 0

    // Create database records in a transaction

    const dbResult = await prisma.$transaction(async (tx) => {
      // Create workspace
      const workspace = await tx.workspace.create({
        data: { name: `${basics.companyName} Workspace` },
      })

      // Create user record
      const user = await tx.user.create({
        data: {
          authId,
          email: normalizedEmail,
          name: basics.companyName,
        },
      })

      // Create workspace member
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          workspaceRole: 'OWNER',
        },
      })

      // Create company
      const company = await tx.company.create({
        data: {
          workspaceId: workspace.id,
          name: basics.companyName,
          annualRevenue: annualRevenue,
          annualEbitda: 0,
          ownerCompensation: 0,
          businessDescription: basics.businessDescription,
          icbIndustry,
          icbSuperSector,
          icbSector,
          icbSubSector,
          gicsSubIndustry,
          gicsSector,
          classificationMethod,
          classificationConfidence,
          ...(classification?.referenceCompanies && classification.referenceCompanies.length > 0 && {
            businessProfile: JSON.parse(JSON.stringify({
              referenceCompanies: classification.referenceCompanies,
              classificationExplanation: classification.explanation,
            })),
          }),
        },
      })

      // Save core factors
      await tx.coreFactors.create({
        data: {
          companyId: company.id,
          revenueSizeCategory: revenueSizeCategory as RevenueSizeCategory,
          revenueModel: profile.revenueModel as RevenueModelType,
          laborIntensity: profile.laborIntensity as LaborIntensityLevel,
          assetIntensity: profile.assetIntensity as AssetIntensityLevel,
          ownerInvolvement: profile.ownerInvolvement as OwnerInvolvementLevel,
          grossMarginProxy: profile.grossMarginProxy as GrossMarginCategory,
        },
      })

      // Create valuation snapshot with V1 + V2 dual-write
      await tx.valuationSnapshot.create({
        data: {
          companyId: company.id,
          createdByUserId: user.id,
          adjustedEbitda,
          industryMultipleLow: multiples.ebitdaMultipleLow,
          industryMultipleHigh: multiples.ebitdaMultipleHigh,
          // V1 fields (kept for compatibility)
          coreScore,
          briScore,
          briFinancial: getCategoryScoreNormalized('FINANCIAL'),
          briTransferability: getCategoryScoreNormalized('TRANSFERABILITY'),
          briOperational: getCategoryScoreNormalized('OPERATIONAL'),
          briMarket: getCategoryScoreNormalized('MARKET'),
          briLegalTax: getCategoryScoreNormalized('LEGAL_TAX'),
          briPersonal: getCategoryScoreNormalized('PERSONAL'),
          baseMultiple: results.baseMultiple,
          discountFraction,
          finalMultiple: results.finalMultiple,
          currentValue: v2Valuation.evMid,
          potentialValue: results.potentialValue,
          valueGap: Math.round(gapResult.totalGap),
          alphaConstant: ALPHA,
          snapshotReason: 'Public assessment (/assess)',
          // V2 fields
          businessQualityScore: bqsResult.score,
          dealReadinessScore: drsResult.score,
          riskSeverityScore: riskResult.riskSeverityScore,
          industryMedianMultiple: v2Valuation.industryMedianMultiple,
          qualityAdjustedMultiple: v2Valuation.qualityAdjustedMultiple,
          riskAdjustedMultiple: v2Valuation.riskAdjustedMultiple,
          evLow: v2Valuation.evLow,
          evMid: v2Valuation.evMid,
          evHigh: v2Valuation.evHigh,
          spreadFactor: v2Valuation.spreadFactor,
          dlomRate,
          dlomAmount,
          riskDiscounts: riskResult.discounts.map(d => ({
            name: d.name, rate: d.rate, explanation: d.explanation,
          })),
          qualityAdjustments: bqsResult.adjustments.adjustments.map(a => ({
            factor: a.factor, impact: a.impact, explanation: a.explanation,
          })),
          totalQualityAdjustment: v2Valuation.totalQualityAdjustment,
          addressableGap: gapResult.addressableGap,
          structuralGap: gapResult.structuralGap,
          aspirationalGap: gapResult.aspirationalGap,
        },
      })

      // Update company DRS
      await tx.company.update({
        where: { id: company.id },
        data: {
          dealReadinessScore: drsResult.score,
          dealReadinessUpdatedAt: new Date(),
        },
      })

      // Generate preliminary tasks based on initial scan results
      const preliminaryTasks = generatePreliminaryTasks(categoryBreakdown, profile.ownerInvolvement)
      if (preliminaryTasks.length > 0) {
        await Promise.all(preliminaryTasks.map((task, index) =>
          tx.task.create({
            data: {
              companyId: company.id,
              title: task.title,
              description: task.description,
              actionType: 'TYPE_I_EVIDENCE',
              taskNature: 'EVIDENCE',
              briCategory: task.category as import('@prisma/client').BriCategory,
              rawImpact: task.estimatedValue,
              normalizedValue: task.estimatedValue,
              effortLevel: 'LOW',
              complexity: 'SIMPLE',
              estimatedHours: task.estimatedHours,
              inActionPlan: true,
              priorityRank: index + 1,
              sourceType: 'ONBOARDING_PRELIMINARY',
              buyerConsequence: task.buyerConsequence,
            },
          })
        ))
      }

      return { company, user, workspace }
    })

    // Mark any existing assessment leads as converted (prevents Day 2/5 drip emails)
    prisma.assessmentLead.updateMany({
      where: { email: normalizedEmail, convertedAt: null },
      data: { convertedAt: new Date() },
    }).catch(err => console.warn('[assess/save] Failed to mark leads as converted:', err instanceof Error ? err.message : String(err)))

    // High-value prospect alert to Brad (revenue >$3M or value gap >$1M)
    const isHighValue = annualRevenue >= 3_000_000 || results.valueGap >= 1_000_000
    if (isHighValue) {
      const CATEGORY_LABELS: Record<string, string> = {
        FINANCIAL: 'Financial',
        TRANSFERABILITY: 'Transferability',
        OPERATIONAL: 'Operations',
        MARKET: 'Market',
        LEGAL_TAX: 'Legal & Tax',
        PERSONAL: 'Personal',
      }
      const breakdown = results.categoryBreakdown ?? {}
      const topRiskEntry = Object.entries(breakdown).sort(([, a], [, b]) => a - b)[0]
      const topRiskLabel = topRiskEntry
        ? (CATEGORY_LABELS[topRiskEntry[0]] || topRiskEntry[0])
        : 'Operations'

      sendProspectAlert({
        email: normalizedEmail,
        companyName: basics.companyName,
        annualRevenue: annualRevenue,
        briScore: results.briScore,
        valueGap: results.valueGap,
        topRiskCategory: topRiskLabel,
      }).catch(err => console.error('[assess/save] Prospect alert failed:', err instanceof Error ? err.message : String(err)))
    }

    return NextResponse.json({
      success: true,
      companyId: dbResult.company.id,
      userId: dbResult.user.id,
      // _debug: { magicLinkStatus },
    })
  } catch (err) {
    console.error('[assess/save] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }
}

/**
 * Send a prospect alert email to Brad for high-value signups.
 */
// SECURITY: Escape user-supplied values before embedding in HTML emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

async function sendProspectAlert(params: {
  email: string
  companyName: string
  annualRevenue: number
  briScore: number
  valueGap: number
  topRiskCategory: string
}) {
  const { Resend } = await import('resend')
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) return

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
    return `$${Math.round(v)}`
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
    to: 'brad@exitosx.com',
    subject: `High-Value Prospect: ${params.companyName} (${formatCurrency(params.annualRevenue)} revenue)`,
    html: `
      <h2>New High-Value Prospect</h2>
      <table style="font-family: sans-serif; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Company</td><td>${escapeHtml(params.companyName)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Email</td><td><a href="mailto:${encodeURIComponent(params.email)}">${escapeHtml(params.email)}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Revenue</td><td>${formatCurrency(params.annualRevenue)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Buyer Readiness</td><td>${Math.round(params.briScore)}/100</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Value Gap</td><td>${formatCurrency(params.valueGap)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Top Risk</td><td>${escapeHtml(params.topRiskCategory)}</td></tr>
      </table>
      <p style="margin-top: 16px; font-size: 13px; color: #666;">
        Suggested Day 3 outreach: "I saw your assessment. Your biggest risk is ${escapeHtml(params.topRiskCategory)}. I've helped companies like yours close this gap. Want 15 minutes to walk through your specific situation?"
      </p>
    `,
  })
}

function getRevenueSizeCategory(revenue: number): string {
  if (revenue < 500000) return 'UNDER_500K'
  if (revenue < 1000000) return 'FROM_500K_TO_1M'
  if (revenue < 3000000) return 'FROM_1M_TO_3M'
  if (revenue < 10000000) return 'FROM_3M_TO_10M'
  if (revenue < 25000000) return 'FROM_10M_TO_25M'
  return 'OVER_25M'
}

/**
 * Generate deterministic preliminary tasks based on initial scan category scores.
 * These are universal high-confidence tasks that don't require AI — they give
 * the user something actionable immediately after onboarding.
 */
const PRELIMINARY_TASK_TEMPLATES: Record<string, {
  title: string
  description: string
  estimatedValue: number
  estimatedHours: number
  buyerConsequence: string
}[]> = {
  FINANCIAL: [
    {
      title: 'Gather your last 3 years of financial statements',
      description: 'Collect P&L, balance sheet, and cash flow statements for the last 3 fiscal years. Buyers will request these in due diligence. Having them organized shows financial maturity.',
      estimatedValue: 5000,
      estimatedHours: 0.25,
      buyerConsequence: 'Buyers discount businesses that can\'t quickly produce clean financials. This is table stakes for any transaction.',
    },
  ],
  TRANSFERABILITY: [
    {
      title: 'List your top 5 customer relationships and concentration risk',
      description: 'Document your top 5 customers by revenue, their contract terms, tenure, and key contacts. Calculate what % of revenue each represents. This addresses buyer concern about customer concentration.',
      estimatedValue: 5000,
      estimatedHours: 1,
      buyerConsequence: 'Customer concentration is a top deal-killer. Buyers want to know if the revenue base survives the transition.',
    },
  ],
  OPERATIONAL: [
    {
      title: 'Document your 3 most critical business processes',
      description: 'Write a brief (1-page each) description of your 3 most important workflows — how work gets done, who does what, and what tools are used. Focus on processes that would be hardest to figure out without you.',
      estimatedValue: 5000,
      estimatedHours: 3,
      buyerConsequence: 'Buyers see risk in businesses without documented processes. This proves the business can run without you.',
    },
  ],
  LEGAL_TAX: [
    {
      title: 'Review your key contracts and agreements',
      description: 'Compile a list of your most important contracts: leases, vendor agreements, customer contracts, employment agreements. Note expiration dates, change-of-control clauses, and any verbal-only agreements that need to be formalized.',
      estimatedValue: 5000,
      estimatedHours: 2,
      buyerConsequence: 'Buyers walk away from businesses with unresolved legal exposure. Missing or expired contracts are red flags in due diligence.',
    },
  ],
  MARKET: [
    {
      title: 'Identify your competitive advantages and market position',
      description: 'Write a brief summary of what makes your business defensible: proprietary processes, brand strength, customer loyalty, barriers to entry. Be honest about vulnerabilities too — buyers will find them.',
      estimatedValue: 3000,
      estimatedHours: 1,
      buyerConsequence: 'Buyers pay premiums for defensible market positions. Articulating your moat builds buyer confidence.',
    },
  ],
}

function generatePreliminaryTasks(
  categoryBreakdown: Record<string, number>,
  ownerInvolvement: string,
): { title: string; description: string; category: string; estimatedValue: number; estimatedHours: number; buyerConsequence: string }[] {
  // Sort categories by score (lowest first) — target the weakest areas
  const sorted = Object.entries(categoryBreakdown)
    .filter(([cat]) => cat !== 'PERSONAL') // Exclude personal readiness from tasks
    .sort(([, a], [, b]) => a - b)

  const tasks: { title: string; description: string; category: string; estimatedValue: number; estimatedHours: number; buyerConsequence: string }[] = []

  // Pick tasks from the 3 lowest-scoring categories
  for (const [category] of sorted.slice(0, 3)) {
    const templates = PRELIMINARY_TASK_TEMPLATES[category]
    if (templates && templates.length > 0) {
      tasks.push({ ...templates[0], category })
    }
  }

  // Always add a transferability task if owner involvement is HIGH or CRITICAL
  if ((ownerInvolvement === 'HIGH' || ownerInvolvement === 'CRITICAL') &&
      !tasks.some(t => t.category === 'TRANSFERABILITY')) {
    const template = PRELIMINARY_TASK_TEMPLATES['TRANSFERABILITY'][0]
    if (template && tasks.length < 5) {
      tasks.push({ ...template, category: 'TRANSFERABILITY' })
    }
  }

  return tasks
}
