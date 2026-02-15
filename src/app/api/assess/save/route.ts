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
import { ALPHA } from '@/lib/valuation/calculate-valuation'
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

    // Create user via Supabase admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
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

    // Generate magic link for email verification
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    })

    // Send verification email if we have a link
    if (linkData?.properties?.hashed_token) {
      const verificationType = linkData.properties.verification_type === 'magiclink' ? 'email' : (linkData.properties.verification_type ?? 'email')
      const magicLinkUrl = `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=${verificationType}&next=/dashboard`

      try {
        const { sendMagicLinkEmail } = await import('@/lib/email/send-magic-link-email')
        await sendMagicLinkEmail({ email: normalizedEmail, magicLinkUrl })
      } catch (emailErr) {
        console.error('[assess/save] Email send failed:', emailErr instanceof Error ? emailErr.message : String(emailErr))
      }
    }

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
          adjustedEbitda: 0,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 0.5,
          briScore: body.scan.briScore / 100,
          briFinancial: 0,
          briTransferability: 0,
          briOperational: 0,
          briMarket: 0,
          briLegalTax: 0,
          briPersonal: 0,
          baseMultiple: results.baseMultiple,
          discountFraction: 0,
          finalMultiple: results.finalMultiple,
          currentValue: results.currentValue,
          potentialValue: results.potentialValue,
          valueGap: results.valueGap,
          alphaConstant: ALPHA,
          snapshotReason: 'Public assessment (/assess)',
        },
      })

      return { company, user, workspace }
    })

    // Send Day 0 results email (non-blocking)
    const topRisk = results.categoryBreakdown
      ?.sort((a, b) => a.score - b.score)[0]
      ?? { category: 'OPERATIONAL', label: 'Operations', score: 50 }
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
