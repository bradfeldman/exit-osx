'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard'
import { useCompany } from '@/contexts/CompanyContext'

export default function AssessmentPage() {
  const router = useRouter()
  const { selectedCompanyId, selectedCompany, isLoading } = useCompany()

  useEffect(() => {
    // Redirect to setup if no company selected
    if (!isLoading && !selectedCompanyId) {
      router.push('/dashboard/company/setup')
    }
  }, [isLoading, selectedCompanyId, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!selectedCompanyId || !selectedCompany) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AssessmentWizard companyId={selectedCompanyId} companyName={selectedCompany.name} />
    </div>
  )
}
