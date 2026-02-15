import { NextResponse } from 'next/server'
import { getUserByUnsubscribeToken, unsubscribeUser } from '@/lib/email/preferences'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Handle email unsubscribe via token.
 * GET /api/email/unsubscribe?token=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 })
    }

    // Find user by token
    const user = await getUserByUnsubscribeToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 404 })
    }

    // Unsubscribe the user
    await unsubscribeUser(user.userId)

    // Return success page (simple HTML)
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Exit OSx</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      background: white;
      border-radius: 12px;
      padding: 48px 32px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-size: 24px;
      color: #3D3D3D;
      margin: 0 0 16px 0;
    }
    p {
      font-size: 16px;
      color: #666666;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    a {
      display: inline-block;
      padding: 12px 32px;
      background-color: #B87333;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    a:hover {
      background-color: #A0621E;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You've been unsubscribed</h1>
    <p>
      We've removed <strong>${escapeHtml(user.email)}</strong> from all email notifications.
    </p>
    <p style="font-size: 14px; color: #888888;">
      You can re-enable emails anytime in your account settings.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'}/dashboard">
      Return to Dashboard
    </a>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  } catch (error) {
    console.error('[API] Error in email/unsubscribe:', error)
    return NextResponse.json(
      // SECURITY FIX (PROD-060): Removed String(error) from response to prevent leaking stack traces
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
