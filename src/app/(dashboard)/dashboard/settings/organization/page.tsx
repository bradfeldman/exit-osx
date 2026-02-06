import { redirect } from 'next/navigation'

export default function OrganizationSettingsPage() {
  redirect('/dashboard/settings?tab=team')
}
