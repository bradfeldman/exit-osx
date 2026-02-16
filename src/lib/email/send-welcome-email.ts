import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendWelcomeEmailParams {
  email: string
  magicLinkUrl: string
  companyName?: string
  briScore?: number
  currentValue?: number
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`
  }
  return `$${value.toLocaleString()}`
}

/**
 * Sends a welcome/verification email after account creation.
 * The user's account is already fully set up — this confirms email ownership
 * and unlocks full platform features (ongoing emails, team invites, etc.).
 *
 * When assessment data is provided (assess flow), includes a BRI score teaser
 * to motivate verification. Without data (signup page), shows a simpler welcome.
 */
export async function sendWelcomeEmail({ email, magicLinkUrl, companyName, briScore, currentValue }: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping welcome email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const hasAssessmentData = !!(companyName && briScore !== undefined && currentValue !== undefined)

  const teaserSection = hasAssessmentData ? `
              <!-- Results Teaser -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #1e293b; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">
                      ${companyName}'s Results
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 12px auto 0 auto;">
                      <tr>
                        <td style="padding: 0 20px; text-align: center;">
                          <p style="margin: 0 0 2px 0; font-size: 12px; color: rgba(255,255,255,0.5);">BRI Score</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${Math.round(briScore!)}</p>
                          <p style="margin: 2px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.5);">out of 100</p>
                        </td>
                        <td style="width: 1px; background-color: rgba(255,255,255,0.15); padding: 0;"></td>
                        <td style="padding: 0 20px; text-align: center;">
                          <p style="margin: 0 0 2px 0; font-size: 12px; color: rgba(255,255,255,0.5);">Estimated Value</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${formatCurrency(currentValue!)}</p>
                          <p style="margin: 2px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.5);">current estimate</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
  ` : ''

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: 'Welcome to Exit OSx — Verify Your Email',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Exit OSx</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 28px; font-weight: 700; color: #3D3D3D; letter-spacing: -0.5px;">Exit OS<span style="color: #B87333;">x</span></span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Welcome to Exit OSx
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Your account is ready. Verify your email to unlock the full platform.
              </p>

              ${teaserSection}

              <!-- Unlock List -->
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #3D3D3D;">
                Verify your email to unlock:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #666666;">
                    <span style="color: #10B981; margin-right: 8px;">&#10003;</span> Full exit readiness reports
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #666666;">
                    <span style="color: #10B981; margin-right: 8px;">&#10003;</span> Team invites &amp; task delegation
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #666666;">
                    <span style="color: #10B981; margin-right: 8px;">&#10003;</span> Weekly digests &amp; signal alerts
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #666666;">
                    <span style="color: #10B981; margin-right: 8px;">&#10003;</span> Shareable reports for advisors
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${magicLinkUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Already Active Notice -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #888888; text-align: center;">
                Your account is ready — you can <a href="${baseUrl}/login" style="color: #B87333;">log in anytime</a>.
              </p>

              <!-- Fallback link -->
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #999999; text-align: center;">
                If the button does not work, copy and paste this URL into your browser:<br>
                <a href="${magicLinkUrl}" style="color: #B87333; word-break: break-all;">${magicLinkUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 24px 40px; background-color: #FAFAFA; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; text-align: center;">
                If you did not create an Exit OSx account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                <a href="${baseUrl}/privacy" style="color: #999999;">Privacy Policy</a> &middot;
                <a href="${baseUrl}/terms" style="color: #999999;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })

    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
