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
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react'

interface ProofDocument {
  id: string
  fileName: string
  fileUrl: string
  status: string
}

interface TaskCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: {
    id: string
    title: string
    actionType: string
  }
  onComplete: (taskId: string, completionNotes?: string, proofDocuments?: ProofDocument[]) => Promise<void>
}

const ACTION_TYPE_PROOF_HINTS: Record<string, string> = {
  TYPE_I_EVIDENCE: 'Upload the evidence document, report, or analysis you gathered.',
  TYPE_II_DOCUMENTATION: 'Upload the documentation, SOP, or policy you created.',
  TYPE_III_OPERATIONAL: 'Upload screenshots, metrics, or reports showing the operational change.',
  TYPE_IV_INSTITUTIONALIZE: 'Upload system documentation, training records, or process documentation.',
  TYPE_V_RISK_REDUCTION: 'Upload insurance certificate, signed contract, or compliance report.',
  TYPE_VI_ALIGNMENT: 'Upload meeting notes, signed agreement, or communication records.',
  TYPE_VII_READINESS: 'Upload test results, vacation report, or business continuity documentation.',
  TYPE_VIII_SIGNALING: 'Upload marketing materials, press release, or website screenshots.',
  TYPE_IX_OPTIONS: 'Upload analysis document, term sheet, or strategic plan.',
  TYPE_X_DEFER: 'No proof needed for deferred tasks.',
}

export function TaskCompletionDialog({
  open,
  onOpenChange,
  task,
  onComplete,
}: TaskCompletionDialogProps) {
  const [completionNotes, setCompletionNotes] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<ProofDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const proofHint = ACTION_TYPE_PROOF_HINTS[task.actionType] || 'Upload proof of completion.'

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
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

        const { proofDocument, uploadUrl, publicUrl } = await createResponse.json()

        // 2. Upload file to signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
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
            publicUrl,
          }),
        })

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm upload')
        }

        const { proofDocument: confirmedDoc } = await confirmResponse.json()

        setUploadedFiles(prev => [...prev, {
          id: confirmedDoc.id,
          fileName: file.name,
          fileUrl: publicUrl,
          status: 'CURRENT',
        }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveFile = (docId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== docId))
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    setError(null)

    try {
      await onComplete(task.id, completionNotes || undefined, uploadedFiles.length > 0 ? uploadedFiles : undefined)
      // Reset state
      setCompletionNotes('')
      setUploadedFiles([])
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleClose = () => {
    if (!isUploading && !isCompleting) {
      setCompletionNotes('')
      setUploadedFiles([])
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Proof Upload Section */}
          <div className="space-y-2">
            <Label>Proof of Completion</Label>
            <p className="text-xs text-muted-foreground mb-2">{proofHint}</p>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isUploading ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
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
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 w-full"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Excel, Images (max 10MB)
                  </p>
                </button>
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
                  {uploadedFiles.length} file(s) uploaded - will appear in Data Room
                </p>
              </div>
            )}
          </div>

          {/* Completion Notes */}
          <div className="space-y-2">
            <Label htmlFor="completionNotes">Completion Notes (Optional)</Label>
            <Textarea
              id="completionNotes"
              placeholder="Add any notes about how you completed this task..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading || isCompleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isUploading || isCompleting}
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : (
              'Complete Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
