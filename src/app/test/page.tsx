/**
 * TEMPORARY DIAGNOSTIC PAGE
 * Minimal Next.js page that goes through the root layout (with all providers).
 * If this page loads but /login doesn't, the issue is in the login page code.
 * If this page ALSO fails, the issue is in the root layout (providers, GTM, etc).
 * Remove after debugging is complete.
 */
import Link from 'next/link'

export default function TestPage() {
  return (
    <div style={{ fontFamily: '-apple-system, sans-serif', padding: '20px' }}>
      <h1>Test Page Works</h1>
      <p>If you see this, Next.js + root layout providers are working.</p>
      <p>Server time: {new Date().toISOString()}</p>
      <p>This page goes through the same root layout as /login (AnalyticsProvider, MotionProvider, CookieConsent, GTM).</p>
      <ul>
        <li><Link href="/api/diag">Full diagnostics — zero JS (/api/diag)</Link></li>
        <li><Link href="/login">Login page (/login)</Link></li>
      </ul>
    </div>
  )
}
