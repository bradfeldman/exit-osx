import { sendEmail, getUnsubscribeLink } from './service'

interface TrialWinback30EmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  briScore: number
}

export async function sendTrialWinback30Email(params: TrialWinback30EmailParams) {
  const { userId, email, name, companyName, briScore } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = 'Still thinking about your exit?'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Win-Back - Exit OSx</title>
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
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Hey ${firstName},
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                It's been a month since your Exit-Ready trial ended. We just wanted to check in.
              </p>

              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                ${companyName}'s last Buyer Readiness Score was <strong>${roundedBRI}</strong>. Whether you're planning to sell this year or in five, staying on top of readiness makes the difference between a good exit and a great one.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Your data, your progress, and your action plan are all still here.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Pick Up Where You Left Off
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #BBBBBB;">
                This is our last automated check-in. We won't email again unless you re-engage.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #BBBBBB;">
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from these emails
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
    emailType: 'TRIAL_WINBACK_30',
    to: email,
    subject,
    html,
  })
}
