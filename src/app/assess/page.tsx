import { AssessmentFlow } from '@/components/assess/AssessmentFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Exit Readiness Assessment',
  description: 'See how buyers would price your business today. Get your Buyer Readiness Score, valuation estimate, and personalized action plan in under 5 minutes.',
}

export default function AssessPage() {
  return <AssessmentFlow />
}
