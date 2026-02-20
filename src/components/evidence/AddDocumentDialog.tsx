'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'

interface AddDocumentDialogProps {
  evidenceCategory: string
  categoryLabel: string
  onSuccess: () => void
  onClose: () => void
}

const REFRESH_OPTIONS = [
  { value: 'NEVER', label: 'Never (one-time)' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
]

export function AddDocumentDialog({
  evidenceCategory,
  categoryLabel,
  onSuccess,
  onClose,
}: AddDocumentDialogProps) {
  const { selectedCompanyId } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documentName, setDocumentName] = useState('')
  const [refreshCadence, setRefreshCadence] = useState('NEVER')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const ACCEPTED_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/png',
    'image/jpeg',
  ])

  const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

  const validateAndSetFile = (file: File) => {
    if (!ACCEPTED_TYPES.has(file.type)) {
      setErrorMessage('File type not accepted. Upload PDF, Word, TXT, PNG, JPEG, or Excel files only.')
      return
    }
    if (file.size > MAX_SIZE) {
      setErrorMessage('File must be under 2 MB')
      return
    }
    setSelectedFile(file)
    setErrorMessage('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleSave = async () => {
    if (!documentName.trim() || !selectedCompanyId) return

    setStatus('saving')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('documentName', documentName.trim())
      formData.append('evidenceCategory', evidenceCategory)
      formData.append('refreshCadence', refreshCadence)
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const response = await fetch(
        `/api/companies/${selectedCompanyId}/evidence/custom`,
        { method: 'POST', body: formData }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setStatus('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 800)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
    if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`
    return `${bytes} B`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">
            Add to {categoryLabel}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document Name */}
        <div className="mb-4">
          <label htmlFor="doc-name" className="block text-sm font-medium text-foreground mb-1.5">
            Document Name
          </label>
          <input
            id="doc-name"
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="e.g. EBITDA Bridge"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)] focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Refresh Period */}
        <div className="mb-5">
          <label htmlFor="refresh-cadence" className="block text-sm font-medium text-foreground mb-1.5">
            How often should this be updated?
          </label>
          <select
            id="refresh-cadence"
            value={refreshCadence}
            onChange={(e) => setRefreshCadence(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)] focus:border-transparent"
          >
            {REFRESH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* File Upload (optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Upload File <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-[var(--burnt-orange)] bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/20'
              }`}
            >
              <Upload className={`h-6 w-6 mx-auto mb-1.5 ${isDragOver ? 'text-[var(--burnt-orange)]' : 'text-muted-foreground/40'}`} />
              <p className="text-sm text-muted-foreground">Drag and drop or click to select</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">PDF, Word, Excel, TXT, PNG, or JPEG up to 2 MB</p>
            </button>
          ) : (
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <FileCheck className="h-6 w-6 text-green-dark shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!selectedFile && (
            <p className="text-xs text-muted-foreground mt-1.5">
              You can save without a file to create a placeholder and upload later.
            </p>
          )}
        </div>

        {/* Error */}
        {errorMessage && (
          <p className="text-sm text-destructive mb-3">{errorMessage}</p>
        )}

        {/* Success */}
        {status === 'success' && (
          <p className="text-sm text-green-dark mb-3 font-medium">Saved successfully!</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={status === 'saving'}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!documentName.trim() || status === 'saving' || status === 'success'}
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : status === 'success' ? (
              'Done'
            ) : selectedFile ? (
              'Upload & Save'
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
