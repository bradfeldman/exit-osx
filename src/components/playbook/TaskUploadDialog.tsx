'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react'

interface UploadedDocument {
  id: string
  fileName: string
  fileUrl: string
  status: string
}

interface TaskUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: {
    id: string
    title: string
    actionType: string
  }
  onUploadComplete?: () => void
}

const ACTION_TYPE_PROOF_HINTS: Record<string, string> = {
  TYPE_I_EVIDENCE: 'Upload evidence documents, reports, or analysis.',
  TYPE_II_DOCUMENTATION: 'Upload documentation, SOPs, or policies.',
  TYPE_III_OPERATIONAL: 'Upload screenshots, metrics, or reports showing changes.',
  TYPE_IV_INSTITUTIONALIZE: 'Upload system docs, training records, or process docs.',
  TYPE_V_RISK_REDUCTION: 'Upload insurance certificates, contracts, or compliance reports.',
  TYPE_VI_ALIGNMENT: 'Upload meeting notes, agreements, or communication records.',
  TYPE_VII_READINESS: 'Upload test results or business continuity documentation.',
  TYPE_VIII_SIGNALING: 'Upload marketing materials, press releases, or screenshots.',
  TYPE_IX_OPTIONS: 'Upload analysis documents, term sheets, or strategic plans.',
  TYPE_X_DEFER: 'Upload any relevant documentation.',
}

export function TaskUploadDialog({
  open,
  onOpenChange,
  task,
  onUploadComplete,
}: TaskUploadDialogProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const proofHint = ACTION_TYPE_PROOF_HINTS[task.actionType] || 'Upload supporting documents for this task.'

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return

    setIsUploading(true)
    setError(null)

    try {
      for (const file of files) {
        // 1. Get signed upload URL
        const createResponse = await fetch(`/api/tasks/${task.id}/proof`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        })

        if (!createResponse.ok) {
          const data = await createResponse.json()
          throw new Error(data.error || 'Failed to create upload')
        }

        const { proofDocument, uploadUrl } = await createResponse.json()

        // 2. Upload file to signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file')
        }

        // 3. Confirm upload complete
        const confirmResponse = await fetch(`/api/tasks/${task.id}/proof`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: proofDocument.id,
          }),
        })

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm upload')
        }

        const { proofDocument: confirmedDoc } = await confirmResponse.json()

        setUploadedFiles(prev => [...prev, {
          id: confirmedDoc.id,
          fileName: file.name,
          fileUrl: '',
          status: 'CURRENT',
        }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await processFiles(Array.from(files))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set inactive if we're actually leaving the drop zone (not entering a child)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFiles(files)
    }
  }

  const handleRemoveFile = (docId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== docId))
  }

  const handleDone = () => {
    if (uploadedFiles.length > 0 && onUploadComplete) {
      onUploadComplete()
    }
    setUploadedFiles([])
    setError(null)
    onOpenChange(false)
  }

  const handleClose = () => {
    if (!isUploading) {
      setUploadedFiles([])
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Supporting Documents</Label>
            <p className="text-xs text-muted-foreground mb-2">{proofHint}</p>

            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isUploading
                  ? 'border-primary bg-primary/5'
                  : isDragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className={`flex flex-col items-center gap-2 w-full ${isDragActive ? 'pointer-events-none' : ''}`}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 w-full"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, Excel, Images (max 10MB)
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                {uploadedFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[200px]">{file.fileName}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(file.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-green-600">
                  {uploadedFiles.length} file(s) uploaded and linked to this task
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleDone}
            disabled={isUploading}
          >
            {uploadedFiles.length > 0 ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
