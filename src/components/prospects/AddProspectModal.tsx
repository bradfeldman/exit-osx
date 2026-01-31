'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SmartInputField } from './SmartInputField'
import { ParsedPreview } from './ParsedPreview'
import { DuplicateWarning } from './DuplicateWarning'
import { ParsedInput, ParsedPerson, ParsedCompany } from '@/lib/contact-system/smart-parser'
import { BuyerType } from '@prisma/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BUYER_TYPE_LABELS } from '@/lib/deal-tracker/constants'
import { Loader2, AlertCircle, Building2, User, Sparkles, FileText } from 'lucide-react'

interface AddProspectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (result: { companyId?: string; personId?: string }) => void
  /** If provided, adds directly to this deal */
  dealId?: string
  /** Default buyer type for companies */
  defaultBuyerType?: BuyerType
}

export function AddProspectModal({
  isOpen,
  onClose,
  onCreated,
  dealId,
  defaultBuyerType = BuyerType.STRATEGIC,
}: AddProspectModalProps) {
  const [activeTab, setActiveTab] = useState<'smart' | 'manual'>('smart')
  const [inputValue, setInputValue] = useState('')
  const [parsed, setParsed] = useState<ParsedInput | null>(null)
  const [buyerType, setBuyerType] = useState<BuyerType>(defaultBuyerType)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedExistingCompany, setSelectedExistingCompany] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'preview'>('input')

  const handleParsed = useCallback((result: ParsedInput) => {
    setParsed(result)
    setError(null)
  }, [])

  const handlePersonChange = (index: number, person: ParsedPerson) => {
    if (parsed) {
      const newPeople = [...parsed.people]
      newPeople[index] = person
      setParsed({ ...parsed, people: newPeople })
    }
  }

  const handleCompanyChange = (index: number, company: ParsedCompany) => {
    if (parsed) {
      const newCompanies = [...parsed.companies]
      newCompanies[index] = company
      setParsed({ ...parsed, companies: newCompanies })
    }
  }

  const handleUseExisting = (duplicate: { id: string; type: string }) => {
    if (duplicate.type === 'company') {
      setSelectedExistingCompany(duplicate.id)
    }
  }

  const handleNext = () => {
    if (!parsed || (parsed.companies.length === 0 && parsed.people.length === 0)) {
      setError('Please enter some contact information first')
      return
    }
    setStep('preview')
  }

  const handleSubmit = async () => {
    if (!parsed) return

    setIsSubmitting(true)
    setError(null)

    try {
      let companyId = selectedExistingCompany
      let personId: string | undefined

      // Create company if we have one and not using existing
      if (parsed.companies.length > 0 && !selectedExistingCompany) {
        const company = parsed.companies[0]
        const companyRes = await fetch('/api/contact-system/canonical/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: company.name,
            website: company.website,
            linkedInUrl: company.linkedInUrl,
            companyType: buyerType,
          }),
        })

        if (!companyRes.ok) {
          const data = await companyRes.json()
          throw new Error(data.error || 'Failed to create company')
        }

        const companyData = await companyRes.json()
        companyId = companyData.company.id
      }

      // Create person if we have one
      if (parsed.people.length > 0) {
        const person = parsed.people[0]
        const personRes = await fetch('/api/contact-system/canonical/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            phone: person.phone,
            currentTitle: person.title,
            linkedInUrl: person.linkedInUrl,
            currentCompanyId: companyId,
          }),
        })

        if (!personRes.ok) {
          const data = await personRes.json()
          throw new Error(data.error || 'Failed to create person')
        }

        const personData = await personRes.json()
        personId = personData.person.id
      }

      // If dealId provided, add as buyer
      if (dealId && companyId) {
        const buyerRes = await fetch(`/api/deals/${dealId}/buyers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canonicalCompanyId: companyId,
          }),
        })

        if (!buyerRes.ok) {
          const data = await buyerRes.json()
          throw new Error(data.error || 'Failed to add buyer to deal')
        }
      }

      // Reset and close
      setInputValue('')
      setParsed(null)
      setStep('input')
      setSelectedExistingCompany(null)
      onCreated({ companyId: companyId || undefined, personId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setInputValue('')
      setParsed(null)
      setStep('input')
      setSelectedExistingCompany(null)
      setError(null)
      onClose()
    }
  }

  const hasCompanies = parsed && parsed.companies.length > 0
  const hasPeople = parsed && parsed.people.length > 0
  const hasData = hasCompanies || hasPeople

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'input' ? (
              <>
                <Sparkles className="h-5 w-5 text-primary" />
                Add Prospect
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-primary" />
                Review & Confirm
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {step === 'input' ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'smart' | 'manual')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="smart">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Smart Input
                    </TabsTrigger>
                    <TabsTrigger value="manual">
                      <FileText className="h-4 w-4 mr-1" />
                      Manual Entry
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="smart" className="mt-4 space-y-4">
                    <SmartInputField
                      value={inputValue}
                      onChange={setInputValue}
                      onParsed={handleParsed}
                      minRows={6}
                    />

                    {/* Duplicate Warning */}
                    {hasCompanies && (
                      <DuplicateWarning
                        searchValue={parsed!.companies[0].name}
                        type="company"
                        onUseExisting={handleUseExisting}
                        onCreateNew={() => setSelectedExistingCompany(null)}
                      />
                    )}

                    {/* Buyer Type Selection */}
                    {hasCompanies && (
                      <div className="space-y-2">
                        <Label>Buyer Type</Label>
                        <Select
                          value={buyerType}
                          onValueChange={(v) => setBuyerType(v as BuyerType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BUYER_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Quick Summary */}
                    {hasData && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium">Detected:</p>
                        <div className="flex flex-wrap gap-2">
                          {hasCompanies && (
                            <div className="flex items-center gap-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                              <Building2 className="h-3.5 w-3.5" />
                              {parsed!.companies[0].name}
                            </div>
                          )}
                          {hasPeople && (
                            <div className="flex items-center gap-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                              <User className="h-3.5 w-3.5" />
                              {parsed!.people[0].fullName || parsed!.people[0].email}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="mt-4">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Manual entry form coming soon. Use Smart Input for now.
                    </p>
                  </TabsContent>
                </Tabs>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {selectedExistingCompany && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Using existing company record
                    </p>
                  </div>
                )}

                <ParsedPreview
                  parsed={parsed!}
                  onPersonChange={handlePersonChange}
                  onCompanyChange={handleCompanyChange}
                  editable={true}
                />

                {dealId && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This company will be added as a buyer to the current deal.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'input' ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!hasData}>
                Next: Review
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Prospect'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
