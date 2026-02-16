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
import { ALPHA, calculateCoreScore, type CoreFactors } from '@/lib/valuation/calculate-valuation'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { generateReportToken } from '@/lib/report-token'
import { sendOnboardingCompleteEmail } from '@/lib/email/send-onboarding-complete-email'

/**
 * POST /api/assess/save
 *
 * Public endpoint that creates a user account + company + assessment snapshot
 * from the public /assess flow data. Sends a magic link email for verification.
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
        const { sendMagicLinkEmail } = await import('@/lib/email/send-magic-link-email')
        const emailResult = await sendMagicLinkEmail({ email: normalizedEmail, magicLinkUrl })
        if (emailResult.success) {
          magicLinkStatus = 'sent'
        } else {
          magicLinkStatus = `send_failed: ${emailResult.error}`
          console.error('[assess/save] Magic link email failed:', emailResult.error)
        }
      } catch (emailErr) {
        magicLinkStatus = `send_threw: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`
        console.error('[assess/save] Email send threw:', emailErr instanceof Error ? emailErr.message : String(emailErr))
      }
    } else if (!linkError) {
      magicLinkStatus = `no_token: ${JSON.stringify(linkData)}`
      console.error('[assess/save] No hashed_token from generateLink — linkData:', JSON.stringify(linkData))
    }

    // Recalculate valuation inputs server-side (don't trust client values for storage)
    const coreScore = calculateCoreScore(profile as CoreFactors)
    const multiples = await getIndustryMultiples('professional-services')
    const estimatedEbitda = estimateEbitdaFromRevenue(basics.annualRevenue, multiples)
    const briScore = Math.max(0, Math.min(100, body.scan.briScore)) / 100
    const discountFraction = Math.pow(1 - briScore, ALPHA)

    // Create database records in a transaction
    const revenueSizeCategory = getRevenueSizeCategory(basics.annualRevenue)

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
          annualRevenue: basics.annualRevenue,
          annualEbitda: 0,
          ownerCompensation: 0,
          businessDescription: basics.businessDescription,
          icbIndustry: 'Industrials',
          icbSuperSector: 'Industrial Goods and Services',
          icbSector: 'Industrial Support Services',
          icbSubSector: 'professional-services',
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

      // Create valuation snapshot
      await tx.valuationSnapshot.create({
        data: {
          companyId: company.id,
          createdByUserId: user.id,
          adjustedEbitda: estimatedEbitda,
          industryMultipleLow: multiples.ebitdaMultipleLow,
          industryMultipleHigh: multiples.ebitdaMultipleHigh,
          coreScore,
          briScore,
          briFinancial: results.categoryBreakdown?.FINANCIAL ?? 0,
          briTransferability: results.categoryBreakdown?.TRANSFERABILITY ?? 0,
          briOperational: results.categoryBreakdown?.OPERATIONAL ?? 0,
          briMarket: results.categoryBreakdown?.MARKET ?? 0,
          briLegalTax: results.categoryBreakdown?.LEGAL_TAX ?? 0,
          briPersonal: results.categoryBreakdown?.PERSONAL ?? 0,
          baseMultiple: results.baseMultiple,
          discountFraction,
          finalMultiple: results.finalMultiple,
          currentValue: results.currentValue,
          potentialValue: results.potentialValue,
          valueGap: results.valueGap,
          alphaConstant: ALPHA,
          snapshotReason: 'Public assessment (/assess)',
        },
      })

      // Generate preliminary tasks based on initial scan results
      const categoryBreakdown = results.categoryBreakdown ?? {}
      const preliminaryTasks = generatePreliminaryTasks(categoryBreakdown, profile.ownerInvolvement)
      if (preliminaryTasks.length > 0) {
        await Promise.all(preliminaryTasks.map((task, index) =>
          tx.task.create({
            data: {
              companyId: company.id,
              title: task.title,
              description: task.description,
              actionType: 'TYPE_I_EVIDENCE',
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

    // Send Day 0 results email (non-blocking)
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
    const topRisk = topRiskEntry
      ? { category: topRiskEntry[0], label: CATEGORY_LABELS[topRiskEntry[0]] || topRiskEntry[0], score: topRiskEntry[1] * 100 }
      : { category: 'OPERATIONAL', label: 'Operations', score: 50 }
    const topTask = results.topTasks?.[0] ?? null
    const reportToken = generateReportToken(dbResult.company.id)

    sendOnboardingCompleteEmail({
      email: normalizedEmail,
      name: basics.companyName,
      companyName: basics.companyName,
      companyId: dbResult.company.id,
      currentValue: results.currentValue,
      potentialValue: results.potentialValue,
      valueGap: results.valueGap,
      briScore: results.briScore,
      topRisk,
      topTask,
      reportToken,
    }).catch(err => console.error('[assess/save] Day 0 email failed:', err instanceof Error ? err.message : String(err)))

    // High-value prospect alert to Brad (revenue >$3M or value gap >$1M)
    const isHighValue = basics.annualRevenue >= 3_000_000 || results.valueGap >= 1_000_000
    if (isHighValue) {
      sendProspectAlert({
        email: normalizedEmail,
        companyName: basics.companyName,
        annualRevenue: basics.annualRevenue,
        briScore: results.briScore,
        valueGap: results.valueGap,
        topRiskCategory: topRisk.label,
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
      estimatedHours: 2,
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
