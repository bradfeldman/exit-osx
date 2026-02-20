import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface PartnerMonthlySummaryParams {
  email: string
  partnerName?: string
  ownerName: string
  companyName: string
  monthYear: string
  briDirection: 'up' | 'down' | 'stable'
  briChangePoints: number
  tasksCompleted: number
  tasksRemaining: number
  accessToken: string
}

export async function sendPartnerMonthlySummaryEmail(params: PartnerMonthlySummaryParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping partner summary email')
    return { success: false, error: 'Email service not configured' }
  }

  const {
    email, partnerName, ownerName, companyName, monthYear,
    briDirection, briChangePoints, tasksCompleted, tasksRemaining, accessToken,
  } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const summaryUrl = `${baseUrl}/partner/summary/${accessToken}`
  const greeting = partnerName ? `Hi ${partnerName}` : 'Hi there'

  const directionEmoji = briDirection === 'up' ? '&#9650;' : briDirection === 'down' ? '&#9660;' : '&#8212;'
  const directionColor = briDirection === 'up' ? '#16a34a' : briDirection === 'down' ? '#dc2626' : '#6b7280'
  const directionLabel = briDirection === 'up' ? 'improving' : briDirection === 'down' ? 'declining' : 'stable'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: `${companyName} — ${monthYear} Progress Update`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:24px;margin-bottom:24px;">

  <div style="background:#1a1a2e;padding:32px 24px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;margin:0;">Monthly Progress Update</h1>
    <p style="color:#a1a1aa;font-size:14px;margin:8px 0 0;">${companyName} — ${monthYear}</p>
  </div>

  <div style="padding:24px;">
    <p style="font-size:15px;color:#374151;line-height:1.6;">${greeting},</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">
      Here's a summary of ${ownerName}'s exit readiness progress for ${companyName} this month.
    </p>

    <div style="display:flex;gap:16px;margin:24px 0;">
      <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;margin:0;">Readiness Trend</p>
        <p style="font-size:18px;font-weight:700;margin:4px 0;color:${directionColor};">
          ${directionEmoji} ${briChangePoints} pts ${directionLabel}
        </p>
      </div>
      <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;margin:0;">Tasks Completed</p>
        <p style="font-size:24px;font-weight:700;margin:4px 0;color:#111827;">${tasksCompleted}</p>
        <p style="font-size:12px;color:#6b7280;margin:0;">${tasksRemaining} remaining</p>
      </div>
    </div>

    <div style="text-align:center;margin:32px 0 16px;">
      <a href="${summaryUrl}" style="display:inline-block;background:#0071E3;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
        View Full Summary
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      No sensitive financial data is shared in this summary.
    </p>
  </div>

  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">Exit OSx — Building exit-ready businesses</p>
  </div>
</div>
</body>
</html>`,
    })

    console.log(`[Email] Sent partner monthly summary to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send partner monthly summary:', error)
    return { success: false, error: String(error) }
  }
}
