'use client'

import { ReactNode, Suspense } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  )
}

export function OnboardingProviders({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </CompanyProvider>
  )
}
