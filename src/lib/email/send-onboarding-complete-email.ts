import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface OnboardingCompleteEmailParams {
  email: string
  name?: string
  companyName: string
  companyId: string
  currentValue: number
  potentialValue: number
  valueGap: number
  briScore: number
  topRisk: {
    category: string
    label: string
    score: number
  }
  topTask: {
    title: string
    category: string
    estimatedValue: number
  } | null
  reportToken: string
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
 * Sends the "Exit Readiness Report" email after onboarding completion.
 * This delivers immediate value and gives them ONE clear action.
 */
export async function sendOnboardingCompleteEmail(params: OnboardingCompleteEmailParams): Promise<{ success: boolean; error?: string }> {
  const { email, name, companyName, currentValue, potentialValue, valueGap, briScore, topRisk, topTask, reportToken } = params

  if (!resend) {
    console.warn('[Email] Resend not configured, skipping onboarding complete email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const roundedBRI = Math.round(briScore)
  const _firstName = name?.split(' ')[0] || 'there' // Reserved for future personalization

  // Determine BRI color and status
  const briColor = roundedBRI >= 70 ? '#10B981' : roundedBRI >= 50 ? '#F59E0B' : '#EF4444'
  const briStatus = roundedBRI >= 70 ? 'Strong' : roundedBRI >= 50 ? 'Moderate' : 'Needs Work'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: `${companyName}'s Exit Readiness Report`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Exit Readiness Report - Exit OSx</title>
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

          <!-- Hero Section - Valuation -->
          <tr>
            <td style="padding: 24px 40px 40px 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">
                Your Exit Readiness Report
              </p>
              <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                ${companyName}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: rgba(255,255,255,0.6);">
                Based on your risk assessment
              </p>

              <!-- Current Value -->
              <p style="margin: 0 0 4px 0; font-size: 14px; color: rgba(255,255,255,0.7);">
                Current Estimated Value
              </p>
              <p style="margin: 0 0 20px 0; font-size: 48px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">
                ${formatCurrency(currentValue)}
              </p>

              <!-- Value Gap Alert -->
              ${valueGap > 0 ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 24px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #FFFFFF;">
                      You could be worth <strong style="color: #FFFFFF;">${formatCurrency(potentialValue)}</strong>
                    </p>
                    <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.85);">
                      That's <strong>${formatCurrency(valueGap)}</strong> you're leaving on the table.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- BRI Score -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 70%;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      Buyer Readiness Index
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #666666;">
                      How attractive you are to buyers
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
              <p style="margin: 16px 0 0 0; font-size: 14px; color: #666666;">
                ${roundedBRI >= 70 ? 'Your business is well-positioned for buyer interest.' : roundedBRI >= 50 ? "There's room to improve before going to market." : 'Addressing key risks could significantly increase your sale price.'}
              </p>
            </td>
          </tr>

          <!-- Top Risk -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                Your Biggest Gap
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #92400E;">
                      ${topRisk.label}
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 80%;">
                          <div style="background-color: rgba(146, 64, 14, 0.2); border-radius: 4px; height: 8px;">
                            <div style="background-color: #D97706; border-radius: 4px; height: 8px; width: ${topRisk.score}%;"></div>
                          </div>
                        </td>
                        <td style="text-align: right; padding-left: 12px;">
                          <span style="font-size: 14px; font-weight: 600; color: #92400E;">${topRisk.score}/100</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #A16207;">
                      This is the area where focused improvement will have the biggest impact on your valuation.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- #1 Priority Task -->
          ${topTask ? `
          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f0 0%, #ffffff 100%); border: 2px solid #B8733330; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #B87333; padding: 6px 12px; border-radius: 20px;">
                          <span style="font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                            Your #1 Priority
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #3D3D3D;">
                      ${topTask.title}
                    </p>

                    ${topTask.estimatedValue > 0 ? `
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #10B981;">
                      Could add <strong>${formatCurrency(topTask.estimatedValue)}</strong> to your valuation
                    </p>
                    ` : ''}

                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius: 8px; background-color: #B87333;">
                          <a href="${baseUrl}/dashboard/actions" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                            Start This Task
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${baseUrl}/dashboard/actions" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View Your Action Plan
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `}

          <!-- View Full Report CTA -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">
                Want to share this with your advisor or partner?
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; border: 2px solid #B87333;">
                    <a href="${baseUrl}/report/${reportToken}" target="_blank" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #B87333; text-decoration: none; border-radius: 8px;">
                      View &amp; Share Full Report
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Proof -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F0FDF4; border-top: 1px solid #BBF7D0;">
              <p style="margin: 0; font-size: 14px; color: #166534; text-align: center;">
                <strong>Buyers pay premium valuations</strong> for businesses that clear their readiness bar on day one.
                <span style="display: block; margin-top: 4px; font-size: 12px; color: #22C55E;">— Exit Planning Institute, 2025</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
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

    console.log(`[Email] Sent onboarding complete email to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send onboarding complete email:', error)
    return { success: false, error: String(error) }
  }
}
