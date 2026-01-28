import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendAccountExistsEmailParams {
  email: string
  name?: string
}

/**
 * Sends an email to users who try to sign up with an existing email address.
 * This provides a helpful message instead of leaving them confused.
 */
export async function sendAccountExistsEmail({ email, name }: SendAccountExistsEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping account exists email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const loginUrl = `${baseUrl}/login`
  const resetPasswordUrl = `${baseUrl}/forgot-password`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: 'Sign In to Your Exit OSx Account',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Already Exists - Exit OSx</title>
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
              <!-- Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 30px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #E8F5E9; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px;">&#128075;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Welcome Back${name ? `, ${name}` : ''}!
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Someone (hopefully you!) tried to create a new account using this email address. Good news - you already have an Exit OSx account!
              </p>

              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Simply sign in with your existing credentials to continue your exit planning journey.
              </p>

              <!-- Sign In Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Sign In to Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Forgot Password Link -->
              <p style="margin: 0 0 0 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                Forgot your password? <a href="${resetPasswordUrl}" style="color: #B87333; text-decoration: none;">Reset it here</a>
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 24px 40px; background-color: #FAFAFA; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; text-align: center;">
                If you didn't try to create an account, you can safely ignore this email. Your account is secure.
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
                A Pasadena Private Financial Group Company
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
    console.error('[Email] Failed to send account exists email:', error)
    return { success: false, error: String(error) }
  }
}
