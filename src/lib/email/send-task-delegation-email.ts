import { sendEmail, getUnsubscribeLink } from './service'

interface TaskDelegationEmailParams {
  userId: string
  email: string
  name?: string
  companyId: string
  companyName: string
  taskId: string
  taskTitle: string
  taskDescription?: string
  taskCategory: string
  estimatedValue?: number
  delegatedBy: {
    name: string
    email: string
  }
  dueDate?: Date | null
  inviteToken?: string // Optional: if provided, links to invite acceptance page instead of direct task
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

function formatCategory(category: string): string {
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Sends task delegation invite email.
 * "You've been invited to help with [task]"
 */
export async function sendTaskDelegationEmail(params: TaskDelegationEmailParams) {
  const {
    userId,
    email,
    name,
    companyId,
    companyName,
    taskId,
    taskTitle,
    taskDescription,
    taskCategory,
    estimatedValue,
    delegatedBy,
    dueDate,
    inviteToken,
  } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  // If inviteToken is provided, link to invite acceptance page; otherwise direct to task
  const taskUrl = inviteToken
    ? `${baseUrl}/invite/task/${inviteToken}`
    : `${baseUrl}/dashboard/action-center?task=${taskId}`
  const firstName = name?.split(' ')[0] || 'there'
  const delegatorFirstName = delegatedBy.name.split(' ')[0]
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const dueDateString = dueDate
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dueDate))
    : null

  const subject = `${delegatorFirstName} needs your help with ${companyName}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Delegation - Exit OSx</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 28px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.5px;">Exit OS<span style="color: #0071E3;">x</span></span>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #888888;">
                Task Assignment
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #1D1D1F;">
                Hey ${firstName} 👋
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #666666;">
                <strong>${delegatedBy.name}</strong> has asked for your help preparing <strong>${companyName}</strong> for exit.
              </p>
            </td>
          </tr>

          <!-- Task Card -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #F5F5F7 0%, #ffffff 100%); border: 2px solid #0071E330; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <!-- Category Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="background-color: #F3F4F6; padding: 4px 12px; border-radius: 20px;">
                          <span style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${formatCategory(taskCategory)}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1D1D1F;">
                      ${taskTitle}
                    </p>

                    ${taskDescription ? `
                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      ${taskDescription}
                    </p>
                    ` : ''}

                    ${estimatedValue && estimatedValue > 0 ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 12px 16px;">
                          <p style="margin: 0; font-size: 13px; color: #166534;">
                            Could add <strong style="color: #15803D;">${formatCurrency(estimatedValue)}</strong> to valuation
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${dueDateString ? `
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      <strong>Due:</strong> ${dueDateString}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Why This Matters -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1E40AF;">
                      Why this matters
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #3B82F6;">
                      Every task you complete improves ${companyName}'s readiness for sale — and increases the final exit value.
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
                  <td style="border-radius: 8px; background-color: #0071E3;">
                    <a href="${taskUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      ${inviteToken ? 'Accept Invite & View Task' : 'View Task Details'}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delegator Contact -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 13px; color: #888888; text-align: center;">
                Questions? Reply to this email or reach out to ${delegatedBy.name} at <a href="mailto:${delegatedBy.email}" style="color: #0071E3; text-decoration: none;">${delegatedBy.email}</a>
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
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from task notifications
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
    emailType: 'TASK_DELEGATION',
    to: email,
    subject,
    html,
  })
}
