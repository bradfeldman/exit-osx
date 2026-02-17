'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'

interface MissingDocumentCardProps {
  id: string
  name: string
  category: string
  buyerExplanation: string
  importance: 'required' | 'expected' | 'helpful'
  /** Show category label on the right side */
  categoryLabel?: string
  onUploadSuccess?: () => void
  /** Fallback: open dialog instead of inline upload */
  onUploadClick?: () => void
}

const IMPORTANCE_STYLES: Record<string, string> = {
  required: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  expected: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  helpful: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}

const EVIDENCE_ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
])

const EVIDENCE_MAX_SIZE = 2 * 1024 * 1024 // 2 MB

export function MissingDocumentCard({
  id,
  name,
  category,
  buyerExplanation,
  importance,
  categoryLabel,
  onUploadSuccess,
  onUploadClick: _onUploadClick,
}: MissingDocumentCardProps) {
  const { selectedCompanyId } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [successCount, setSuccessCount] = useState(0)

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!selectedCompanyId || files.length === 0) return

    const invalidType = files.find(f => !EVIDENCE_ACCEPTED_TYPES.has(f.type))
    if (invalidType) {
      setUploadStatus('error')
      setUploadError('File type not accepted. Upload PDF, Word, TXT, PNG, JPEG, or Excel files only.')
      return
    }

    const oversized = files.find(f => f.size > EVIDENCE_MAX_SIZE)
    if (oversized) {
      setUploadStatus('error')
      setUploadError(`${oversized.name} is too large. File must be under 2 MB`)
      return
    }

    setUploadStatus('uploading')
    setUploadError('')
    setUploadProgress({ current: 0, total: files.length })
    setSuccessCount(0)

    let uploaded = 0
    let failed = 0

    for (const file of files) {
      setUploadProgress({ current: uploaded + 1, total: files.length })

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentName', name)
        formData.append('evidenceCategory', category)
        formData.append('expectedDocumentId', id)

        const response = await fetch(`/api/companies/${selectedCompanyId}/evidence/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        uploaded++
      } catch {
        failed++
      }
    }

    setSuccessCount(uploaded)

    if (failed > 0 && uploaded === 0) {
      setUploadStatus('error')
      setUploadError(`All ${failed} file${failed > 1 ? 's' : ''} failed to upload.`)
    } else if (failed > 0) {
      setUploadStatus('error')
      setUploadError(`${uploaded} uploaded, ${failed} failed.`)
      setTimeout(() => onUploadSuccess?.(), 1500)
    } else {
      setUploadStatus('success')
      setTimeout(() => onUploadSuccess?.(), 1000)
    }
  }, [selectedCompanyId, name, category, id, onUploadSuccess])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const fileList = e.dataTransfer.files
    if (fileList && fileList.length > 0) {
      uploadFiles(Array.from(fileList))
    }
  }, [uploadFiles])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (fileList && fileList.length > 0) {
      uploadFiles(Array.from(fileList))
    }
    // Reset so the same files can be selected again
    e.target.value = ''
  }, [uploadFiles])

  if (uploadStatus === 'success') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {successCount === 1 ? '1 file uploaded' : `${successCount} files uploaded`}
          </span>
        </div>
      </div>
    )
  }

  if (uploadStatus === 'uploading') {
    return (
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-muted-foreground">
            {uploadProgress.total === 1
              ? 'Uploading...'
              : `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'rounded-lg border p-3 transition-all',
        isDragOver
          ? 'border-primary border-dashed bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/30',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDragOver ? (
            <Upload className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground">{name}</span>
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize',
            IMPORTANCE_STYLES[importance],
          )}>
            {importance}
          </span>
        </div>
        {categoryLabel && (
          <span className="text-xs text-muted-foreground">{categoryLabel}</span>
        )}
      </div>

      {isDragOver ? (
        <p className="text-sm text-primary font-medium mt-1.5 pl-6">
          Drop file(s) to upload as {name}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground italic mt-1.5 pl-6 leading-relaxed">
            &ldquo;{buyerExplanation}&rdquo;
          </p>
          {uploadError && (
            <p className="text-xs text-destructive mt-1.5 pl-6">{uploadError}</p>
          )}
          <div className="mt-2 pl-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--burnt-orange)] hover:underline"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload {name}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
