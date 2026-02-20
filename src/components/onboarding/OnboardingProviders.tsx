'use client'

import { ReactNode, Suspense } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import styles from '@/components/onboarding/onboarding.module.css'

function LoadingFallback() {
  return (
    <div className={styles.obLoadingFallback}>
      <div className={styles.obLoadingCenter}>
        <div className={styles.obSpinner} role="status" aria-label="Loading" />
        <p className={styles.obLoadingText}>Loading...</p>
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
