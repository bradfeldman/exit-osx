import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface PartnerInviteEmailParams {
  email: string
  partnerName?: string
  inviterName: string
  companyName: string
  inviteToken: string
}

export async function sendPartnerInviteEmail(params: PartnerInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping partner invite email')
    return { success: false, error: 'Email service not configured' }
  }

  const { email, partnerName, inviterName, companyName, inviteToken } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const inviteUrl = `${baseUrl}/partner/invite/${inviteToken}`
  const greeting = partnerName ? `Hi ${partnerName}` : 'Hi there'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: `${inviterName} wants you as their accountability partner`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:24px;margin-bottom:24px;">

  <div style="background:#1a1a2e;padding:32px 24px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;margin:0;">Accountability Partner Invite</h1>
  </div>

  <div style="padding:24px;">
    <p style="font-size:15px;color:#374151;line-height:1.6;">${greeting},</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">
      ${inviterName} is preparing <strong>${companyName}</strong> for a potential exit and wants you as their accountability partner.
    </p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">
      As an accountability partner, you'll receive monthly progress summaries (no sensitive financial data) and can send gentle nudge reminders to keep them on track.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteUrl}" style="display:inline-block;background:#B87333;color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      This invitation will remain active until it's accepted or cancelled.
    </p>
  </div>

  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">Exit OSx — Building exit-ready businesses</p>
  </div>
</div>
</body>
</html>`,
    })

    console.log(`[Email] Sent partner invite email to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send partner invite email:', error)
    return { success: false, error: String(error) }
  }
}
