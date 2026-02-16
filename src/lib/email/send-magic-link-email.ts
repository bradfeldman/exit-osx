import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendMagicLinkEmailParams {
  email: string
  magicLinkUrl: string
}

/**
 * Sends a branded email verification email after account creation.
 * The user's account is already fully set up — this just confirms email ownership.
 * Uses Resend instead of Supabase default email templates for consistent branding.
 */
export async function sendMagicLinkEmail({ email, magicLinkUrl }: SendMagicLinkEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping magic link email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: 'Verify Your Email — Exit OSx',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Exit OSx</title>
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
                Verify Your Email
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Tap the button below to confirm your email address. This ensures you can receive important updates and recover your account if needed.
              </p>

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
    console.error('[Email] Failed to send magic link email:', error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
