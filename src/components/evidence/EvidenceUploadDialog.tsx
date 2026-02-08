'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'

interface EvidenceUploadDialogProps {
  documentName: string
  evidenceCategory: string
  expectedDocumentId?: string | null
  onSuccess: () => void
  onClose: () => void
}

export function EvidenceUploadDialog({
  documentName,
  evidenceCategory,
  expectedDocumentId,
  onSuccess,
  onClose,
}: EvidenceUploadDialogProps) {
  const { selectedCompanyId } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [isDragOver, setIsDragOver] = useState(false)

  const validateAndSetFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File too large. Maximum size is 50MB.')
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

  const handleUpload = async () => {
    if (!selectedFile || !selectedCompanyId) return

    setStatus('uploading')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentName', documentName)
      formData.append('evidenceCategory', evidenceCategory)
      if (expectedDocumentId) {
        formData.append('expectedDocumentId', expectedDocumentId)
      }

      const response = await fetch(`/api/companies/${selectedCompanyId}/evidence/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      setStatus('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1200)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Upload Document</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document name */}
        <p className="text-sm text-muted-foreground mb-4">
          {documentName}
        </p>

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
        />

        {!selectedFile ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/20'
            }`}
          >
            <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-muted-foreground/60'}`} />
            <p className="text-sm font-medium text-foreground">Drag and drop or click to select a file</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, CSV, or images up to 50MB</p>
          </button>
        ) : (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-emerald-600 shrink-0" />
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

        {/* Error */}
        {errorMessage && (
          <p className="text-sm text-destructive mt-3">{errorMessage}</p>
        )}

        {/* Success */}
        {status === 'success' && (
          <p className="text-sm text-emerald-600 mt-3 font-medium">Uploaded successfully!</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={status === 'uploading'}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || status === 'uploading' || status === 'success'}
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : status === 'success' ? (
              'Done'
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
