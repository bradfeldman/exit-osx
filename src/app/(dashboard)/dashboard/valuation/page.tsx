import { redirect } from 'next/navigation'

// DCF Valuation has been removed - redirect to main dashboard
export default function ValuationPage() {
  redirect('/dashboard')
}
