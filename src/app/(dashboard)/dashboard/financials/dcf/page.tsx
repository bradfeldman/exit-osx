'use client'

import { useCompany } from '@/contexts/CompanyContext'
import { DCFValuationSection } from '@/components/financials/DCFValuationSection'

export default function DCFPage() {
  const { selectedCompanyId } = useCompany()

  if (!selectedCompanyId) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-8">
        <p className="text-muted-foreground">Select a company to view DCF valuation.</p>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8 space-y-6">
      <DCFValuationSection companyId={selectedCompanyId} />
    </div>
  )
}
