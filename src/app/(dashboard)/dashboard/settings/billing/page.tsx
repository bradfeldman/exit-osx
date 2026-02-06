import { redirect } from 'next/navigation'

export default function BillingSettingsPage() {
  redirect('/dashboard/settings?tab=billing')
}
