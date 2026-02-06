'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OrganizationSettings } from '@/components/settings/OrganizationSettings'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { CompanySettings } from '@/components/settings/CompanySettings'
import { UserSettings } from '@/components/settings/UserSettings'
import { Loader2 } from 'lucide-react'

const VALID_TABS = ['company', 'account', 'team', 'billing'] as const
type SettingsTab = typeof VALID_TABS[number]

function isValidTab(tab: string | null): tab is SettingsTab {
  return VALID_TABS.includes(tab as SettingsTab)
}

export function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const activeTab = isValidTab(tabParam) ? tabParam : 'company'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your company, account, team, and billing</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="account">
          <UserSettings />
        </TabsContent>

        <TabsContent value="team">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="billing">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <BillingSettings />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
