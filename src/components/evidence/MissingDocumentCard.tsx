'use client'

import { useState, useCallback } from 'react'
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

export function MissingDocumentCard({
  id,
  name,
  category,
  buyerExplanation,
  importance,
  categoryLabel,
  onUploadSuccess,
  onUploadClick,
}: MissingDocumentCardProps) {
  const { selectedCompanyId } = useCompany()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [fileName, setFileName] = useState('')

  const uploadFile = useCallback(async (file: File) => {
    if (!selectedCompanyId) return

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus('error')
      setUploadError('File too large. Maximum size is 50MB.')
      return
    }

    setFileName(file.name)
    setUploadStatus('uploading')
    setUploadError('')

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

      setUploadStatus('success')
      setTimeout(() => {
        onUploadSuccess?.()
      }, 1000)
    } catch (err) {
      setUploadStatus('error')
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
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
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  if (uploadStatus === 'success') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{fileName} uploaded</span>
        </div>
      </div>
    )
  }

  if (uploadStatus === 'uploading') {
    return (
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-muted-foreground">Uploading {fileName}...</span>
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
          Drop file to upload as {name}
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
            <button
              type="button"
              onClick={onUploadClick}
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
