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
  Download,
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
  placeholderDocumentId?: string | null
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
  onDownloadDocument?: (docId: string) => void
}

const IMPORTANCE_LABELS: Record<string, string> = {
  required: 'REQUIRED',
  expected: 'EXPECTED',
  helpful: 'HELPFUL',
  custom: 'ADDED',
}

const IMPORTANCE_STYLES: Record<string, string> = {
  required: 'text-red-dark',
  expected: 'text-orange-dark',
  helpful: 'text-primary',
  custom: 'text-purple',
}

const FRESHNESS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  fresh: { bg: 'bg-green-light', text: 'text-green-dark', border: 'border-green/20' },
  current: { bg: 'bg-green-light', text: 'text-green-dark', border: 'border-green/20' },
  due_soon: { bg: 'bg-orange-light', text: 'text-orange-dark', border: 'border-orange/20' },
  overdue: { bg: 'bg-red-light', text: 'text-red-dark', border: 'border-red/20' },
}

const FRESHNESS_BORDER_COLORS: Record<string, string> = {
  fresh: 'border-l-green',
  current: 'border-l-green',
  due_soon: 'border-l-orange',
  overdue: 'border-l-red',
}

const FRESHNESS_LABELS: Record<string, string> = {
  fresh: 'New',
  current: 'Current',
  due_soon: 'Update due',
  overdue: 'Overdue',
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

/** Types that can be previewed inline in the browser */
const VIEWABLE_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
])

function isViewableFile(mimeType: string | null): boolean {
  if (!mimeType) return false
  return VIEWABLE_MIME_TYPES.has(mimeType)
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
  return File
}

export function DocumentSlotCard({
  slot,
  categoryId,
  showBuyerExplanation = false,
  onUploadSuccess,
  onViewDocument,
  onDownloadDocument,
}: DocumentSlotCardProps) {
  const { selectedCompanyId } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const uploadFile = useCallback(async (file: File) => {
    if (!selectedCompanyId) return

    if (!EVIDENCE_ACCEPTED_TYPES.has(file.type)) {
      setUploadStatus('error')
      setUploadError('File type not accepted. Upload PDF, Word, TXT, PNG, JPEG, or Excel files only.')
      return
    }

    if (file.size > EVIDENCE_MAX_SIZE) {
      setUploadStatus('error')
      setUploadError('File must be under 2 MB')
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

      // If this is a placeholder custom doc, send documentId to update it
      if (slot.placeholderDocumentId) {
        formData.append('documentId', slot.placeholderDocumentId)
      }

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
  }, [selectedCompanyId, slot.slotName, categoryId, slot.expectedDocId, slot.placeholderDocumentId, onUploadSuccess])

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
      if (isViewableFile(slot.document.mimeType)) {
        onViewDocument?.(slot.document.id)
      } else {
        onDownloadDocument?.(slot.document.id)
      }
    }
  }, [slot.document, onViewDocument, onDownloadDocument])

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
    if (!selectedCompanyId) return

    // For filled docs, delete the document; for placeholders, delete the placeholder
    const docId = slot.document?.id || slot.placeholderDocumentId
    if (!docId) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/evidence/documents/${docId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete')
      onUploadSuccess?.()
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [selectedCompanyId, slot.document, slot.placeholderDocumentId, onUploadSuccess])

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
      <div className="rounded-xl border border-green/20 bg-green-light/50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-dark shrink-0" />
          <span className="text-sm font-medium text-green-dark">Uploaded successfully</span>
        </div>
      </div>
    )
  }

  // FILLED STATE (has a file uploaded)
  if (slot.isFilled && slot.document) {
    const doc = slot.document
    const FileIcon = getFileIcon(doc.mimeType)
    const freshness = FRESHNESS_STYLES[doc.freshnessState]
    const borderColor = FRESHNESS_BORDER_COLORS[doc.freshnessState]

    return (
      <div
        className={cn(
          'rounded-xl border border-border/50 bg-card p-4 border-l-[3px] hover:shadow-sm transition-shadow',
          borderColor,
        )}
      >
        {/* Header with icon and slot name */}
        <div className="flex items-start gap-2 mb-3">
          <FileIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground leading-tight">
              {slot.slotName}
            </div>
          </div>
          {slot.importance === 'custom' && (
            <span className="text-xs font-semibold text-purple shrink-0">ADDED</span>
          )}
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
              <span>&middot;</span>
              <span>{formatFileSize(doc.fileSize)}</span>
            </>
          )}
          {doc.version > 1 && (
            <>
              <span>&middot;</span>
              <span>v{doc.version}</span>
            </>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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

          {doc.source === 'task' && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border bg-accent-light text-primary border-primary/20">
              From Action
            </span>
          )}
        </div>

        {/* Actions — always visible */}
        <div className="flex items-center gap-3">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Remove this document?</span>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 text-sm font-medium text-red-dark hover:underline disabled:opacity-50"
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
                {isViewableFile(doc.mimeType) ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </>
                )}
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-red-dark hover:underline ml-auto"
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
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,image/*"
          onChange={handleFileInputChange}
        />
      </div>
    )
  }

  // PLACEHOLDER STATE (custom doc added but no file yet)
  if (slot.importance === 'custom' && slot.placeholderDocumentId) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed p-4 transition-all',
          isDragOver
            ? 'border-[var(--burnt-orange)] border-solid bg-primary/5'
            : 'border-purple/30 bg-purple-light/30',
        )}
      >
        <div className="flex justify-center mb-3">
          <CloudUpload
            className={cn(
              'w-6 h-6 transition-colors',
              isDragOver ? 'text-[var(--burnt-orange)]' : 'text-purple/50',
            )}
          />
        </div>

        <div className="text-sm font-semibold text-foreground text-center mb-2">
          {slot.slotName}
        </div>

        <div className="flex justify-center mb-3">
          <span className="text-xs font-semibold text-purple">ADDED</span>
        </div>

        {uploadError && (
          <p className="text-xs text-destructive text-center mb-3">{uploadError}</p>
        )}

        <div className="flex justify-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,image/*"
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
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Remove?</span>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="text-sm font-medium text-red-dark hover:underline disabled:opacity-50"
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
            <button
              type="button"
              onClick={handleDeleteClick}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-red-dark hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>

        {isDragOver && (
          <p className="text-sm text-[var(--burnt-orange)] font-medium text-center mt-2">
            Drop file to upload
          </p>
        )}
      </div>
    )
  }

  // EMPTY STATE (expected document, no upload yet)
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
      <div className="flex justify-center mb-3">
        <CloudUpload
          className={cn(
            'w-6 h-6 transition-colors',
            isDragOver ? 'text-[var(--burnt-orange)]' : 'text-muted-foreground/30',
          )}
        />
      </div>

      <div className="text-sm font-semibold text-foreground text-center mb-2">
        {slot.slotName}
      </div>

      <div className="flex justify-center mb-3">
        <span className={cn('text-xs font-semibold', IMPORTANCE_STYLES[slot.importance])}>
          {IMPORTANCE_LABELS[slot.importance] || slot.importance.toUpperCase()}
        </span>
      </div>

      {showBuyerExplanation && slot.buyerExplanation && (
        <div className="mb-3 pl-3 border-l-2 border-border/30">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            &ldquo;{slot.buyerExplanation}&rdquo;
          </p>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-destructive text-center mb-3">{uploadError}</p>
      )}

      <div className="flex justify-center">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,image/*"
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

      {isDragOver && (
        <p className="text-sm text-[var(--burnt-orange)] font-medium text-center mt-2">
          Drop file to upload
        </p>
      )}
    </div>
  )
}
