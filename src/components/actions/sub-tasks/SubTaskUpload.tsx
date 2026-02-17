'use client'

import { useState, useRef } from 'react'
import { Upload, FileCheck, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubTaskUploadProps {
  stepId: string
  title: string
  completed: boolean
  linkedDocId: string | null
  acceptedTypes: string | null
  onUpload: (stepId: string, file: File) => Promise<void>
}

export function SubTaskUpload({ stepId, title, completed, linkedDocId, acceptedTypes, onUpload }: SubTaskUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB.')
      return
    }
    setIsUploading(true)
    try {
      await onUpload(stepId, file)
      setUploadedFileName(file.name)
    } catch {
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
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
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  if (completed || linkedDocId) {
    return (
      <div className="flex items-start gap-3 py-2">
        <FileCheck className="w-4 h-4 mt-0.5 text-[var(--burnt-orange)] shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground line-through">{title}</span>
          {uploadedFileName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {uploadedFileName} &middot; Uploaded
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes || undefined}
          onChange={handleInputChange}
        />
      </div>
    )
  }

  return (
    <div className="py-2">
      <p className="text-sm text-foreground mb-2">{title}</p>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-all text-sm',
          isDragOver
            ? 'border-[var(--burnt-orange)] bg-[var(--burnt-orange)]/5'
            : 'border-border/50 hover:border-muted-foreground/50 hover:bg-muted/30'
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Drop file here or click to upload</span>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes || undefined}
        onChange={handleInputChange}
      />
      {acceptedTypes && (
        <p className="text-xs text-muted-foreground mt-1">
          Accepted: {acceptedTypes}
        </p>
      )}
    </div>
  )
}
