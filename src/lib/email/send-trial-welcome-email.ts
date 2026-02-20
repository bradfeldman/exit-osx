import { sendEmail, getUnsubscribeLink } from './service'

interface TrialWelcomeEmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  trialEndsAt: Date
}

export async function sendTrialWelcomeEmail(params: TrialWelcomeEmailParams) {
  const { userId, email, name, companyName, trialEndsAt } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const endsFormatted = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = 'Welcome to your 7-day Deal Room trial'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Welcome - Exit OSx</title>
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
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #F0FDF4; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 32px;">&#127881;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Welcome, ${firstName}!
              </h1>

              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                You have <strong>full Deal Room access</strong> for ${companyName} until <strong>${endsFormatted}</strong>.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #888888; text-align: center;">
                Here's what you can explore during your trial:
              </p>

              <!-- Feature Checklist -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #F9FAFB; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #3D3D3D; line-height: 1.5;">
                          &#9989; <strong>Risk Diagnostic</strong> &mdash; See where your business is vulnerable to buyer scrutiny
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #3D3D3D; line-height: 1.5;">
                          &#9989; <strong>Personalized Action Plan</strong> &mdash; Prioritized tasks to close readiness gaps
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #3D3D3D; line-height: 1.5;">
                          &#9989; <strong>Data Room</strong> &mdash; Organize and stage due diligence documents
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #3D3D3D; line-height: 1.5;">
                          &#9989; <strong>Financial Sync</strong> &mdash; Connect QuickBooks for live financial monitoring
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #3D3D3D; line-height: 1.5;">
                          &#9989; <strong>Retirement Model</strong> &mdash; See if your exit will fund your next chapter
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Explore Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                Your trial runs through ${endsFormatted}. No credit card required.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #BBBBBB;">
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from trial emails
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail({
    userId,
    emailType: 'TRIAL_WELCOME',
    to: email,
    subject,
    html,
  })
}
