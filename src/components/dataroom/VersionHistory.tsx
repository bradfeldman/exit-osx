'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Version {
  id: string
  version: number
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string | null
  uploadedBy: { id: string; name: string | null; email: string } | null
  uploadedAt: string
  archivedAt?: string
  isCurrent: boolean
}

interface VersionHistoryProps {
  companyId: string
  document: {
    id: string
    documentName: string
    version: number
  } | null
  isOpen: boolean
  onClose: () => void
  onVersionRestored: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionHistory({
  companyId,
  document,
  isOpen,
  onClose,
  onVersionRestored,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null)

  const fetchVersions = useCallback(async () => {
    if (!document || !companyId) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/documents/${document.id}/versions`
      )

      if (!res.ok) {
        throw new Error('Failed to load versions')
      }

      const data = await res.json()
      setVersions(data.versions || [])
    } catch (err) {
      console.error('Error fetching versions:', err)
      setError('Failed to load version history')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, document])

  useEffect(() => {
    if (isOpen && document) {
      fetchVersions()
      setPreviewUrl(null)
      setPreviewVersion(null)
    }
  }, [isOpen, document, fetchVersions])

  const handlePreview = async (version: Version) => {
    if (version.isCurrent) {
      // Use regular preview endpoint for current version
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/documents/${document?.id}/preview`
      )
      if (res.ok) {
        const data = await res.json()
        setPreviewUrl(data.url)
        setPreviewVersion(version)
      }
    } else {
      // Use version-specific preview endpoint
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/documents/${document?.id}/versions/${version.id}/preview`
      )
      if (res.ok) {
        const data = await res.json()
        setPreviewUrl(data.url)
        setPreviewVersion(version)
      }
    }
  }

  const handleRestore = async (version: Version) => {
    if (!document || version.isCurrent) return

    if (!confirm(`Restore version ${version.version}? This will create a new version with the old file.`)) {
      return
    }

    setRestoringId(version.id)

    try {
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/documents/${document.id}/versions/${version.id}/restore`,
        { method: 'POST' }
      )

      if (!res.ok) {
        throw new Error('Failed to restore version')
      }

      onVersionRestored()
      onClose()
      toast.success('Version restored')
    } catch (err) {
      console.error('Error restoring version:', err)
      toast.error('Failed to restore version')
    } finally {
      setRestoringId(null)
    }
  }

  const isPdf = (mimeType: string | null, fileName: string) => {
    return mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')
  }

  const isImage = (mimeType: string | null, fileName: string) => {
    return mimeType?.startsWith('image/') ||
           /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName || '')
  }

  if (!document) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            {document.documentName} - {versions.length} version{versions.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Version List */}
          <div className="w-1/2 overflow-y-auto border-r pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button variant="outline" className="mt-2" onClick={fetchVersions}>
                  Retry
                </Button>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No version history available</p>
                <p className="text-sm mt-1">Versions are created when you replace a file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      previewVersion?.id === version.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handlePreview(version)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Version {version.version}</span>
                          {version.isCurrent && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {version.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(version.fileSize)} | {formatDate(version.uploadedAt)}
                        </p>
                        {version.uploadedBy && (
                          <p className="text-xs text-muted-foreground">
                            by {version.uploadedBy.name || version.uploadedBy.email}
                          </p>
                        )}
                      </div>

                      {!version.isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestore(version)
                          }}
                          disabled={restoringId === version.id}
                        >
                          {restoringId === version.id ? (
                            <span className="flex items-center gap-1">
                              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                              Restoring
                            </span>
                          ) : (
                            <>
                              <RestoreIcon className="h-3 w-3 mr-1" />
                              Restore
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Timeline connector */}
                    {index < versions.length - 1 && (
                      <div className="absolute left-6 mt-3 w-0.5 h-4 bg-gray-200" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 overflow-hidden flex flex-col">
            {previewUrl && previewVersion ? (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  Preview: Version {previewVersion.version}
                  {previewVersion.isCurrent && ' (Current)'}
                </div>
                <div className="flex-1 overflow-hidden bg-gray-100 rounded-lg">
                  {isPdf(previewVersion.mimeType, previewVersion.fileName) ? (
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full border-0 rounded-lg"
                      title={`Version ${previewVersion.version}`}
                    />
                  ) : isImage(previewVersion.mimeType, previewVersion.fileName) ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={previewUrl}
                        alt={`Version ${previewVersion.version}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Preview not available
                        </p>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Download to view
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <EyeIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Icons
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
