import { sendEmail, getUnsubscribeLink } from './service'

interface WeeklyCheckinEmailParams {
  userId: string
  email: string
  name?: string
  companyId: string
  companyName: string
  briScore: number
  weeksSinceLastUpdate: number
}

/**
 * Sends the weekly check-in email.
 * "Quick check — has anything changed this week?"
 * Encourages users to keep data fresh so drift detection is accurate.
 */
export async function sendWeeklyCheckinEmail(params: WeeklyCheckinEmailParams) {
  const { userId, email, name, companyId, companyName, briScore, weeksSinceLastUpdate } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const briColor = roundedBRI >= 70 ? '#10B981' : roundedBRI >= 50 ? '#F59E0B' : '#EF4444'
  const briStatus = roundedBRI >= 70 ? 'Strong' : roundedBRI >= 50 ? 'Moderate' : 'Needs Work'

  const subject = weeksSinceLastUpdate > 2
    ? `${firstName}, quick check on ${companyName}?`
    : `Your weekly check-in: ${companyName}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Check-In - Exit OSx</title>
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
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #888888;">
                Weekly Check-In
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #3D3D3D;">
                Hey ${firstName}, quick check 👋
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #666666;">
                ${weeksSinceLastUpdate > 2
                  ? `It's been ${weeksSinceLastUpdate} weeks since your last update. Has anything changed at ${companyName}?`
                  : `How's ${companyName} doing this week? Any changes worth updating?`
                }
              </p>
            </td>
          </tr>

          <!-- Current BRI -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 70%;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                            Current Buyer Readiness
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #666666;">
                            Based on ${weeksSinceLastUpdate > 2 ? `data from ${weeksSinceLastUpdate} weeks ago` : 'your latest data'}
                          </p>
                        </td>
                        <td style="text-align: right;">
                          <span style="display: inline-block; padding: 8px 16px; background-color: ${briColor}20; border-radius: 8px;">
                            <span style="font-size: 28px; font-weight: 700; color: ${briColor};">${roundedBRI}</span>
                            <span style="font-size: 14px; color: ${briColor};">/100</span>
                          </span>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${briColor}; font-weight: 600;">
                            ${briStatus}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Update Prompt -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1E40AF;">
                      Quick questions to keep your score fresh:
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: #3B82F6; line-height: 2;">
                      <li>Did revenue change by more than 10%?</li>
                      <li>Did you lose or gain a key customer?</li>
                      <li>Any team changes (hires, departures)?</li>
                      <li>Complete any important tasks?</li>
                    </ul>
                    <p style="margin: 16px 0 0 0; font-size: 13px; color: #60A5FA;">
                      Even small updates keep your valuation and drift tracking accurate.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Update Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #888888;">
                Takes less than 2 minutes
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
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from weekly check-ins
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
    emailType: 'WEEKLY_CHECKIN',
    to: email,
    subject,
    html,
  })
}
