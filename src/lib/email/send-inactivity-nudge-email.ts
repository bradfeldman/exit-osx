import { sendEmail, getUnsubscribeLink } from './service'

interface InactivityNudgeEmailParams {
  userId: string
  email: string
  name?: string
  companyId: string
  companyName: string
  daysSinceLastLogin: number
  briScore: number
  tasksPending: number
}

/**
 * Sends the inactivity nudge email.
 * Triggered after 21 days of no login activity.
 * "Your exit readiness may be slipping"
 */
export async function sendInactivityNudgeEmail(params: InactivityNudgeEmailParams) {
  const { userId, email, name, companyId, companyName, daysSinceLastLogin, briScore, tasksPending } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = `${firstName}, we haven't seen you in ${Math.round(daysSinceLastLogin / 7)} weeks`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inactivity Nudge - Exit OSx</title>
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
                  <td style="width: 64px; height: 64px; background-color: #FEF3C7; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 32px;">&#128064;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Hey ${firstName}, we miss you
              </h1>

              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                It's been <strong>${Math.round(daysSinceLastLogin / 7)} weeks</strong> since you checked in on ${companyName}.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #888888; text-align: center;">
                Here's what might be slipping...
              </p>

              <!-- Risks -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #991B1B;">
                      Risks compound when you look away:
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: #DC2626; line-height: 2;">
                      <li>Customer concentration may have changed</li>
                      <li>Financials drift without monitoring</li>
                      <li>Key person risks grow quietly</li>
                      <li>Documentation falls out of date</li>
                    </ul>
                    <p style="margin: 16px 0 0 0; font-size: 13px; color: #EF4444;">
                      Every week you wait, your Buyer Readiness Score likely drops. And so does your valuation.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Current Status -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #F9FAFB; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 50%; padding-right: 10px; border-right: 1px solid #E5E7EB;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
                            Last Known BRI
                          </p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #3D3D3D; text-align: center;">
                            ${roundedBRI}
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #888888; text-align: center;">
                            (likely lower now)
                          </p>
                        </td>
                        <td style="width: 50%; padding-left: 10px;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
                            Pending Tasks
                          </p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #3D3D3D; text-align: center;">
                            ${tasksPending}
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #888888; text-align: center;">
                            waiting for you
                          </p>
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
                      Get Back on Track
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                Just 10 minutes to update your dashboard and see where you stand
              </p>
            </td>
          </tr>

          <!-- Social Proof -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F0FDF4; border-top: 1px solid #BBF7D0;">
              <p style="margin: 0; font-size: 14px; color: #166534; text-align: center;">
                <strong>Businesses that track readiness monthly</strong> sell for 15-30% more than those that don't.
                <span style="display: block; margin-top: 4px; font-size: 12px; color: #22C55E;">— Exit Planning Institute</span>
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
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from reminder emails
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
    companyId,
    emailType: 'INACTIVITY_NUDGE',
    to: email,
    subject,
    html,
  })
}
