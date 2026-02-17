'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  CloudUpload,
  FileText,
  File,
  Upload,
  Loader2,
  CheckCircle,
  Eye,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'

interface DocumentSlot {
  expectedDocId: string
  slotName: string
  importance: 'required' | 'expected' | 'helpful' | 'custom'
  buyerExplanation: string
  sortOrder: number
  refreshCadence: string
  isFilled: boolean
  document: {
    id: string
    fileName: string
    fileSize: number | null
    mimeType: string | null
    uploadedAt: string
    uploadedByName: string | null
    source: 'direct' | 'task' | 'integration'
    sourceLabel: string | null
    freshnessState: 'fresh' | 'current' | 'due_soon' | 'overdue'
    nextUpdateDue: string | null
    version: number
    hasPreviousVersions: boolean
  } | null
  pendingRequest: null
  linkedActionItem: null
}

interface DocumentSlotCardProps {
  slot: DocumentSlot
  categoryId: string
  showBuyerExplanation?: boolean
  onUploadSuccess?: () => void
  onViewDocument?: (docId: string) => void
}

const IMPORTANCE_LABELS: Record<string, string> = {
  required: 'REQUIRED',
  expected: 'EXPECTED',
  helpful: 'HELPFUL',
}

const IMPORTANCE_STYLES: Record<string, string> = {
  required: 'text-rose-600',
  expected: 'text-amber-600',
  helpful: 'text-sky-600',
}

const FRESHNESS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  fresh: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  current: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  due_soon: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  overdue: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

const FRESHNESS_BORDER_COLORS: Record<string, string> = {
  fresh: 'border-l-emerald-500',
  current: 'border-l-emerald-500',
  due_soon: 'border-l-amber-500',
  overdue: 'border-l-rose-500',
}

const FRESHNESS_LABELS: Record<string, string> = {
  fresh: 'New',
  current: 'Current',
  due_soon: 'Update due',
  overdue: 'Overdue',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${bytes} B`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File

  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) {
    return FileText
  }

  // Default fallback
  return File
}

export function DocumentSlotCard({
  slot,
  categoryId,
  showBuyerExplanation = false,
  onUploadSuccess,
  onViewDocument,
}: DocumentSlotCardProps) {
  const { selectedCompanyId } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const uploadFile = useCallback(async (file: File) => {
    if (!selectedCompanyId) return

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus('error')
      setUploadError(`${file.name} is too large. Maximum size is 50MB.`)
      return
    }

    setUploadStatus('uploading')
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentName', slot.slotName)
      formData.append('evidenceCategory', categoryId)
      formData.append('expectedDocumentId', slot.expectedDocId)

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
        setUploadStatus('idle')
      }, 1000)
    } catch (error) {
      setUploadStatus('error')
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    }
  }, [selectedCompanyId, slot.slotName, categoryId, slot.expectedDocId, onUploadSuccess])

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
      uploadFile(fileList[0])
    }
  }, [uploadFile])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (fileList && fileList.length > 0) {
      uploadFile(fileList[0])
    }
    e.target.value = ''
  }, [uploadFile])

  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (slot.document) {
      onViewDocument?.(slot.document.id)
    }
  }, [slot.document, onViewDocument])

  const handleReplaceClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }, [])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }, [])

  const handleDeleteConfirm = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedCompanyId || !slot.document) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/evidence/documents/${slot.document.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete')
      onUploadSuccess?.()
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [selectedCompanyId, slot.document, onUploadSuccess])

  const handleDeleteCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }, [])

  // UPLOADING STATE
  if (uploadStatus === 'uploading') {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-muted-foreground">Uploading...</span>
        </div>
      </div>
    )
  }

  // SUCCESS STATE
  if (uploadStatus === 'success') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-700">Uploaded successfully</span>
        </div>
      </div>
    )
  }

  // FILLED STATE
  if (slot.isFilled && slot.document) {
    const doc = slot.document
    const FileIcon = getFileIcon(doc.mimeType)
    const freshness = FRESHNESS_STYLES[doc.freshnessState]
    const borderColor = FRESHNESS_BORDER_COLORS[doc.freshnessState]

    return (
      <div
        className={cn(
          'rounded-xl border border-border/50 bg-card p-4 transition-shadow cursor-pointer border-l-[3px]',
          borderColor,
          isHovered && 'shadow-sm',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleViewClick}
      >
        {/* Header with icon and slot name */}
        <div className="flex items-start gap-2 mb-3">
          <FileIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground leading-tight">
              {slot.slotName}
            </div>
          </div>
        </div>

        {/* File name */}
        <div className="text-xs text-muted-foreground truncate mb-1">
          {doc.fileName}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>{formatDate(doc.uploadedAt)}</span>
          {doc.fileSize && (
            <>
              <span>·</span>
              <span>{formatFileSize(doc.fileSize)}</span>
            </>
          )}
          {doc.version > 1 && (
            <>
              <span>·</span>
              <span>v{doc.version}</span>
            </>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Freshness pill */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border',
              freshness.bg,
              freshness.text,
              freshness.border,
            )}
          >
            {FRESHNESS_LABELS[doc.freshnessState]}
            {doc.freshnessState === 'due_soon' && doc.nextUpdateDue && (
              <span> {formatDate(doc.nextUpdateDue)}</span>
            )}
          </span>

          {/* Source badge */}
          {doc.source === 'task' && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
              From Action
            </span>
          )}
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex items-center gap-3 transition-opacity',
            'md:opacity-0 md:group-hover:opacity-100',
            isHovered && 'opacity-100',
          )}
        >
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Remove?</span>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
              </button>
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="text-sm font-medium text-muted-foreground hover:underline"
              >
                No
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleViewClick}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--burnt-orange)] hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                type="button"
                onClick={handleReplaceClick}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--burnt-orange)] hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-rose-600 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    )
  }

  // EMPTY STATE
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'rounded-xl border-2 border-dashed p-4 transition-all',
        isDragOver
          ? 'border-[var(--burnt-orange)] border-solid bg-primary/5'
          : 'border-border/40 bg-muted/10',
      )}
    >
      {/* Upload icon */}
      <div className="flex justify-center mb-3">
        <CloudUpload
          className={cn(
            'w-6 h-6 transition-colors',
            isDragOver ? 'text-[var(--burnt-orange)]' : 'text-muted-foreground/30',
          )}
        />
      </div>

      {/* Slot name */}
      <div className="text-sm font-semibold text-foreground text-center mb-2">
        {slot.slotName}
      </div>

      {/* Importance badge */}
      <div className="flex justify-center mb-3">
        <span className={cn('text-xs font-semibold', IMPORTANCE_STYLES[slot.importance])}>
          {IMPORTANCE_LABELS[slot.importance] || slot.importance.toUpperCase()}
        </span>
      </div>

      {/* Buyer explanation (if enabled) */}
      {showBuyerExplanation && (
        <div className="mb-3 pl-3 border-l-2 border-border/30">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            &ldquo;{slot.buyerExplanation}&rdquo;
          </p>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <p className="text-xs text-destructive text-center mb-3">{uploadError}</p>
      )}

      {/* Upload button */}
      <div className="flex justify-center">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--burnt-orange)] hover:underline"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>

      {/* Drag overlay message */}
      {isDragOver && (
        <p className="text-sm text-[var(--burnt-orange)] font-medium text-center mt-2">
          Drop file to upload
        </p>
      )}
    </div>
  )
}
