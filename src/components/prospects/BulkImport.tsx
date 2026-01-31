'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseBulkInput, ParsedInput } from '@/lib/contact-system/smart-parser'
import { BuyerType } from '@prisma/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BUYER_TYPE_LABELS } from '@/lib/deal-tracker/constants'
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Building2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportResult {
  index: number
  status: 'success' | 'error' | 'duplicate'
  name: string
  message?: string
  companyId?: string
  personId?: string
}

interface BulkImportProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (results: ImportResult[]) => void
  /** If provided, adds companies as buyers to this deal */
  dealId?: string
  defaultBuyerType?: BuyerType
}

export function BulkImport({
  isOpen,
  onClose,
  onComplete,
  dealId,
  defaultBuyerType = BuyerType.STRATEGIC,
}: BulkImportProps) {
  const [step, setStep] = useState<'input' | 'preview' | 'importing' | 'complete'>('input')
  const [rawInput, setRawInput] = useState('')
  const [parsedEntries, setParsedEntries] = useState<ParsedInput[]>([])
  const [buyerType, setBuyerType] = useState<BuyerType>(defaultBuyerType)
  const [results, setResults] = useState<ImportResult[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRawInput(text)
    }
    reader.readAsText(file)
  }

  const handleParse = useCallback(() => {
    if (!rawInput.trim()) {
      setError('Please enter or upload data to import')
      return
    }

    setError(null)
    const entries = parseBulkInput(rawInput)

    if (entries.length === 0) {
      setError('No valid entries found in the input')
      return
    }

    setParsedEntries(entries)
    setStep('preview')
  }, [rawInput])

  const handleImport = async () => {
    setStep('importing')
    setProgress(0)
    setResults([])

    const importResults: ImportResult[] = []
    const total = parsedEntries.length

    for (let i = 0; i < parsedEntries.length; i++) {
      const entry = parsedEntries[i]
      const name =
        entry.companies[0]?.name ||
        entry.people[0]?.fullName ||
        entry.people[0]?.email ||
        `Entry ${i + 1}`

      try {
        let companyId: string | undefined
        let personId: string | undefined

        // Create company if present
        if (entry.companies.length > 0) {
          const company = entry.companies[0]
          const res = await fetch('/api/contact-system/canonical/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: company.name,
              website: company.website,
              linkedInUrl: company.linkedInUrl,
              companyType: buyerType,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            companyId = data.company.id
          } else {
            const errorData = await res.json()
            if (errorData.error?.includes('already exists') || errorData.error?.includes('duplicate')) {
              importResults.push({
                index: i,
                status: 'duplicate',
                name,
                message: 'Company already exists',
              })
              setProgress(((i + 1) / total) * 100)
              continue
            }
            throw new Error(errorData.error || 'Failed to create company')
          }
        }

        // Create person if present
        if (entry.people.length > 0) {
          const person = entry.people[0]
          const res = await fetch('/api/contact-system/canonical/people', {
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

          if (res.ok) {
            const data = await res.json()
            personId = data.person.id
          }
        }

        // Add to deal if dealId provided
        if (dealId && companyId) {
          await fetch(`/api/deals/${dealId}/buyers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canonicalCompanyId: companyId }),
          })
        }

        importResults.push({
          index: i,
          status: 'success',
          name,
          companyId,
          personId,
        })
      } catch (err) {
        importResults.push({
          index: i,
          status: 'error',
          name,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      setProgress(((i + 1) / total) * 100)
    }

    setResults(importResults)
    setStep('complete')
  }

  const handleClose = () => {
    if (step === 'importing') return // Don't close during import

    setRawInput('')
    setParsedEntries([])
    setResults([])
    setStep('input')
    setProgress(0)
    setError(null)

    if (step === 'complete') {
      onComplete(results)
    }
    onClose()
  }

  const downloadTemplate = () => {
    const template = `Company Name,Contact First Name,Contact Last Name,Email,Phone,Title,Website
"Acme Corporation","John","Smith","john.smith@acme.com","555-123-4567","VP Business Development","www.acme.com"
"Global Industries","Jane","Doe","jdoe@global.com","555-987-6543","Managing Director","www.globalindustries.com"`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prospect_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const duplicateCount = results.filter((r) => r.status === 'duplicate').length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import Prospects
          </DialogTitle>
          <DialogDescription>
            Import multiple companies and contacts at once from CSV or pasted data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Input */}
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* File Upload */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Drag and drop a CSV file, or click to browse
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Choose File
                    </Button>
                    <Button variant="ghost" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-1" />
                      Download Template
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste data</span>
                  </div>
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <Label>Paste CSV or contact data</Label>
                  <Textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder={`Company Name,Contact Name,Email,Phone
Acme Corp,John Smith,john@acme.com,555-1234
Another Co,Jane Doe,jane@another.com,555-5678`}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Buyer Type */}
                <div className="space-y-2">
                  <Label>Default Buyer Type</Label>
                  <Select value={buyerType} onValueChange={(v) => setBuyerType(v as BuyerType)}>
                    <SelectTrigger className="w-48">
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

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">
                    Found {parsedEntries.length} entries to import
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review the data below and click Import to proceed.
                  </p>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedEntries.slice(0, 10).map((entry, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            {entry.companies[0] ? (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-purple-500" />
                                {entry.companies[0].name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.people[0] ? (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-blue-500" />
                                {entry.people[0].fullName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.emails[0] || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedEntries.length > 10 && (
                    <div className="p-3 text-center text-sm text-muted-foreground border-t">
                      + {parsedEntries.length - 10} more entries
                    </div>
                  )}
                </div>

                {dealId && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Companies will be added as buyers to the current deal.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Importing */}
            {step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium mb-2">Importing prospects...</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {Math.round(progress)}% complete
                </p>
                <Progress value={progress} className="max-w-xs mx-auto" />
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-700">{successCount}</p>
                    <p className="text-sm text-green-600">Imported</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                    <p className="text-2xl font-bold text-amber-700">{duplicateCount}</p>
                    <p className="text-sm text-amber-600">Duplicates</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                    <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <p className="text-2xl font-bold text-red-700">{errorCount}</p>
                    <p className="text-sm text-red-600">Errors</p>
                  </div>
                </div>

                {/* Results Table */}
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.index}>
                          <TableCell>
                            {result.status === 'success' && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {result.status === 'duplicate' && (
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                            )}
                            {result.status === 'error' && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{result.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {result.status === 'success'
                              ? 'Successfully imported'
                              : result.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={!rawInput.trim()}>
                Parse Data
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {parsedEntries.length} Entries
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
