'use client'

import { IndustryCombobox } from '../IndustryCombobox'
import { IndustryFinderDialog } from '../IndustryFinderDialog'
import type { CompanyFormData } from '../CompanySetupWizard'

interface BasicInfoStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

export function BasicInfoStep({ formData, updateFormData }: BasicInfoStepProps) {
  const handleIndustrySelect = (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => {
    updateFormData({
      icbIndustry: selection.icbIndustry,
      icbSuperSector: selection.icbSuperSector,
      icbSector: selection.icbSector,
      icbSubSector: selection.icbSubSector,
    })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Focus and open the industry combobox
      const industryTrigger = document.getElementById('industry-combobox-trigger')
      if (industryTrigger) {
        industryTrigger.click()
      }
    }
  }

  const isNameValid = formData.name.length > 0
  const isIndustrySelected = formData.icbSubSector.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Company Information</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Let&apos;s start with the basics about your business
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="name" className="text-sm font-semibold text-foreground">
            Company Name
          </label>
          {isNameValid && (
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          )}
        </div>
        <div className="relative">
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            onKeyDown={handleNameKeyDown}
            placeholder="Enter your company name"
            className="w-full px-4 py-3 text-lg font-medium bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Industry Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">
            Industry Classification
          </label>
          {isIndustrySelected && (
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between -mt-1">
          <p className="text-xs text-muted-foreground">
            Search by typing any part of the industry name
          </p>
          <IndustryFinderDialog onSelect={handleIndustrySelect} />
        </div>
        <IndustryCombobox
          triggerId="industry-combobox-trigger"
          value={
            formData.icbSubSector
              ? {
                  icbIndustry: formData.icbIndustry,
                  icbSuperSector: formData.icbSuperSector,
                  icbSector: formData.icbSector,
                  icbSubSector: formData.icbSubSector,
                }
              : undefined
          }
          onSelect={handleIndustrySelect}
        />
      </div>

      {/* Industry Selection Preview */}
      {isIndustrySelected && (
        <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Selected Industry</p>
              <p className="font-semibold text-foreground truncate">{formData.icbSubSector}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.icbIndustry} &rarr; {formData.icbSuperSector} &rarr; {formData.icbSector}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Why industry matters</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your industry classification determines the baseline valuation multiples
            used to estimate your company&apos;s market value.
          </p>
        </div>
      </div>
    </div>
  )
}
