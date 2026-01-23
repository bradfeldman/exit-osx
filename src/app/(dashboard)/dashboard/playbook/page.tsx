'use client'

import { useCompany } from '@/contexts/CompanyContext'
import { PlaybookContent } from '@/components/playbook/PlaybookContent'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PlaybookPage() {
  const { selectedCompanyId, selectedCompany, isLoading } = useCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const expandTaskId = searchParams.get('expand')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Please select a company to view the Action Playbook.
          </p>
          <Button onClick={() => router.push('/dashboard/company/setup')}>
            Set Up Company
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <PlaybookContent
      companyId={selectedCompanyId}
      companyName={selectedCompany.name}
      expandTaskId={expandTaskId || undefined}
    />
  )
}
