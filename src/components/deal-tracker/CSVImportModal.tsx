'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PROSPECT_CSV_EXAMPLE } from '@/lib/deal-tracker/constants'

interface CSVImportModalProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

interface ImportResult {
  batchId: string
  status: string
  totalRows: number
  successful: number
  failed: number
  duplicates: number
  errors: Array<{ row: number; field: string; message: string }>
}

type ImportState = 'upload' | 'importing' | 'complete'

export function CSVImportModal({
  companyId,
  isOpen,
  onClose,
  onImported,
}: CSVImportModalProps) {
  const [state, setState] = useState<ImportState>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setState('upload')
    setFile(null)
    setSkipDuplicates(true)
    setResult(null)
    setError(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleDone = () => {
    resetState()
    onImported()
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([PROSPECT_CSV_EXAMPLE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prospect_buyer_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setFile(droppedFile)
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleImport = async () => {
    if (!file) return

    setState('importing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('skipDuplicates', String(skipDuplicates))

      const res = await fetch(`/api/companies/${companyId}/prospects/import`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setState('complete')
      } else {
        setError(data.error || 'Import failed')
        setState('upload')
      }
    } catch (err) {
      console.error('Error importing:', err)
      setError('Import failed')
      setState('upload')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Prospect List</DialogTitle>
          <DialogDescription>
            Upload a CSV file with potential buyers.
          </DialogDescription>
        </DialogHeader>

        {state === 'upload' && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors hover:border-primary/50
                ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              `}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <FileIcon className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drag and drop a CSV file here, or click to browse
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipDuplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
              />
              <Label htmlFor="skipDuplicates" className="text-sm">
                Skip duplicate company names
              </Label>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Required columns:</strong> company_name, buyer_type</p>
              <p><strong>Optional:</strong> relevance_description, website, headquarters_location</p>
              <p><strong>Buyer types:</strong> strategic, financial, hybrid</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                Import
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'importing' && (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Importing prospects...</p>
          </div>
        )}

        {state === 'complete' && result && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rows</span>
                <span className="font-medium">{result.totalRows}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Successful</span>
                <span className="font-medium">{result.successful}</span>
              </div>
              {result.duplicates > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Duplicates Skipped</span>
                  <span className="font-medium">{result.duplicates}</span>
                </div>
              )}
              {result.failed > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Failed</span>
                  <span className="font-medium">{result.failed}</span>
                </div>
              )}
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <div className="p-3 bg-muted/50 border-b text-sm font-medium">
                  Errors ({result.errors.length})
                </div>
                <div className="divide-y text-sm">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="p-2 text-red-600">
                      Row {err.row}: {err.message}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="p-2 text-muted-foreground">
                      ... and {result.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleDone}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Icons
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
