'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { track } from '@/lib/analytics'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { AgeStep } from './steps/AgeStep'
import { HomeStep } from './steps/HomeStep'
import { RetirementStep } from './steps/RetirementStep'
import { OtherAssetsStep } from './steps/OtherAssetsStep'
import { DebtsStep } from './steps/DebtsStep'
import { RevealStep } from './steps/RevealStep'
import { INITIAL_WIZARD_DATA, type PFSWizardData, type BusinessInfo } from './PFSWizardTypes'
import { wizardToApiPayload } from './pfs-wizard-utils'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from '@/components/financials/financials-pages.module.css'

const STEPS = [
  { id: 1, key: 'age', title: 'About You' },
  { id: 2, key: 'home', title: 'Home & Real Estate' },
  { id: 3, key: 'retirement', title: 'Retirement' },
  { id: 4, key: 'assets', title: 'Other Assets' },
  { id: 5, key: 'debts', title: 'Debts' },
  { id: 6, key: 'reveal', title: 'Your Snapshot' },
]

interface PFSWizardFlowProps {
  onComplete: () => void
  onSkip: () => void
}

export function PFSWizardFlow({ onComplete, onSkip }: PFSWizardFlowProps) {
  const { selectedCompanyId } = useCompany()
  const { refetch: refetchProgression } = useProgression()

  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<PFSWizardData>(INITIAL_WIZARD_DATA)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [stepsSkipped, setStepsSkipped] = useState<number[]>([])

  const startTimeRef = useRef(Date.now())
  const stepStartRef = useRef(Date.now())

  useEffect(() => {
    async function fetchBusinessInfo() {
      if (!selectedCompanyId) return
      try {
        const companyRes = await fetch('/api/companies')
        if (!companyRes.ok) return
        const companyData = await companyRes.json()
        const company = (companyData.companies || []).find(
          (c: { id: string }) => c.id === selectedCompanyId
        )
        if (!company) return

        const dashRes = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
        if (!dashRes.ok) return
        const dashData = await dashRes.json()
        const currentValue = dashData.tier1?.currentValue || 0

        setBusinessInfo({
          companyId: selectedCompanyId,
          companyName: company.name,
          currentValue,
          ownershipPercent: 100,
        })
      } catch {
        // Non-fatal
      }
    }
    fetchBusinessInfo()
  }, [selectedCompanyId])

  useEffect(() => {
    track('pfs_wizard_started', {
      entryPoint: 'pfs_page',
      hasExistingData: false,
    })
  }, [])

  const updateData = useCallback((updates: Partial<PFSWizardData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  const goToStep = useCallback((step: number) => {
    const stepTime = Date.now() - stepStartRef.current
    const currentStepDef = STEPS.find(s => s.id === currentStep)

    if (step > currentStep && currentStepDef) {
      track('pfs_wizard_step_completed', {
        stepNumber: currentStep,
        stepName: currentStepDef.key,
        timeSpentMs: stepTime,
        fieldsCompleted: 0,
      })
    }

    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
    stepStartRef.current = Date.now()
  }, [currentStep])

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      goToStep(currentStep + 1)
    }
  }, [currentStep, goToStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }, [currentStep, goToStep])

  const handleSkipStep = useCallback((stepNumber: number) => {
    setStepsSkipped(prev => [...prev, stepNumber])
    track('pfs_wizard_step_skipped', {
      stepNumber,
      stepName: STEPS.find(s => s.id === stepNumber)?.key || '',
    })
    handleNext()
  }, [handleNext])

  const handleSave = useCallback(async () => {
    if (!selectedCompanyId) return

    setSaving(true)
    setSaveError(null)

    try {
      const payload = wizardToApiPayload(data, stepsSkipped)

      const response = await fetch(
        `/api/companies/${selectedCompanyId}/personal-financials`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save')
      }

      const totalTime = Date.now() - startTimeRef.current
      track('pfs_wizard_completed', {
        totalTimeMs: totalTime,
        stepsSkipped: stepsSkipped.length,
        netWorth: payload.netWorth,
        wealthConcentration: businessInfo
          ? ((businessInfo.currentValue * businessInfo.ownershipPercent / 100) /
              Math.max(1, payload.netWorth + (businessInfo.currentValue * businessInfo.ownershipPercent / 100))) * 100
          : 0,
      })

      await refetchProgression()
      onComplete()
    } catch (error) {
      console.error('PFS wizard save failed:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save. Please try again.')
      track('pfs_wizard_save_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
      })
    } finally {
      setSaving(false)
    }
  }, [selectedCompanyId, data, stepsSkipped, businessInfo, refetchProgression, onComplete])

  const handleSkipWizard = useCallback(() => {
    const totalTime = Date.now() - startTimeRef.current
    track('pfs_wizard_abandoned', {
      lastStep: currentStep,
      totalTimeMs: totalTime,
    })
    onSkip()
  }, [currentStep, onSkip])

  const renderStep = () => {
    const stepProps = {
      data,
      onUpdate: updateData,
      onNext: handleNext,
      onBack: handleBack,
    }

    switch (currentStep) {
      case 1:
        return <AgeStep {...stepProps} />
      case 2:
        return <HomeStep {...stepProps} onSkip={() => handleSkipStep(2)} />
      case 3:
        return <RetirementStep {...stepProps} onSkip={() => handleSkipStep(3)} />
      case 4:
        return <OtherAssetsStep {...stepProps} onSkip={() => handleSkipStep(4)} />
      case 5:
        return <DebtsStep {...stepProps} onSkip={() => handleSkipStep(5)} />
      case 6:
        return (
          <RevealStep
            data={data}
            businessInfo={businessInfo}
            onSave={handleSave}
            onViewPFS={onComplete}
            saving={saving}
            saveError={saveError}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.pfsWizard}>
      {/* Header with progress */}
      <div className={styles.pfsWizardHeader}>
        <div>
          <h2 className={styles.pfsWizardTitle}>Your Financial Snapshot</h2>
          <p className={styles.pfsWizardSubtitle}>
            {currentStep <= 5
              ? "Let's build your financial picture in under 4 minutes."
              : 'Here is your financial snapshot.'}
          </p>
        </div>

        {currentStep <= 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipWizard}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Skip
          </Button>
        )}
      </div>

      {/* Progress dots */}
      {currentStep <= 5 && (
        <div className={styles.pfsProgress}>
          {STEPS.slice(0, 5).map((step) => (
            <div
              key={step.id}
              className={`${styles.pfsProgressDot} ${
                step.id === currentStep
                  ? styles.pfsProgressDotActive
                  : step.id < currentStep
                    ? styles.pfsProgressDotDone
                    : styles.pfsProgressDotPending
              }`}
            />
          ))}
        </div>
      )}

      {/* Step content with slide animation */}
      <div className={styles.pfsStepContent}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
