import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Exit Readiness Assessment | Exit OS',
  description: 'See how buyers would price your business today. Get your Buyer Readiness Index, valuation estimate, and personalized action plan in under 5 minutes.',
}

export default function AssessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Bare layout — no sidebar, no header, no app chrome.
  // This is a focused funnel container.
  return <>{children}</>
}
