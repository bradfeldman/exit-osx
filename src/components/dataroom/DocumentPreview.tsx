'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface DocumentPreviewProps {
  companyId: string
  document: {
    id: string
    documentName: string
    fileName: string | null
    mimeType: string | null
    fileSize: number | null
  } | null
  isOpen: boolean
  onClose: () => void
  onDownload: (docId: string, fileName: string | null) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentPreview({
  companyId,
  document,
  isOpen,
  onClose,
  onDownload,
}: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const fetchPreviewUrl = useCallback(async () => {
    if (!document || !companyId) return

    setIsLoading(true)
    setError(null)

    try {
      // First get the signed URL from our API
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/documents/${document.id}/preview`
      )

      if (!res.ok) {
        throw new Error('Failed to load preview')
      }

      const data = await res.json()

      // For PDFs and images, fetch the file and create a blob URL to avoid CORS issues
      const isPdfFile = document.mimeType === 'application/pdf' ||
                        document.fileName?.toLowerCase().endsWith('.pdf')
      const isImageFile = document.mimeType?.startsWith('image/') ||
                          /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(document.fileName || '')

      if (isPdfFile || isImageFile) {
        // Fetch the actual file content
        console.log('[Preview] Fetching file from:', data.url)
        const fileRes = await fetch(data.url)
        console.log('[Preview] File fetch status:', fileRes.status)
        if (!fileRes.ok) {
          throw new Error('Failed to fetch file')
        }
        const blob = await fileRes.blob()
        console.log('[Preview] Blob size:', blob.size, 'type:', blob.type)
        const blobUrl = URL.createObjectURL(blob)
        console.log('[Preview] Created blob URL:', blobUrl)
        setPreviewUrl(blobUrl)
      } else {
        setPreviewUrl(data.url)
      }
    } catch (err) {
      console.error('Error fetching preview:', err)
      setError('Failed to load preview')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, document])

  useEffect(() => {
    if (isOpen && document) {
      fetchPreviewUrl()
      setImageZoom(1)
      setImagePosition({ x: 0, y: 0 })
    } else {
      setPreviewUrl((prev) => {
        // Revoke blob URL to prevent memory leaks
        if (prev?.startsWith('blob:')) {
          URL.revokeObjectURL(prev)
        }
        return null
      })
      setError(null)
    }
  }, [isOpen, document, fetchPreviewUrl])

  const isPdf = document?.mimeType === 'application/pdf' ||
                document?.fileName?.toLowerCase().endsWith('.pdf')

  const isImage = document?.mimeType?.startsWith('image/') ||
                  /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(document?.fileName || '')

  const handleZoomIn = () => setImageZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setImageZoom((z) => Math.max(z - 0.25, 0.5))
  const handleResetZoom = () => {
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        handleZoomIn()
      } else {
        handleZoomOut()
      }
    }
  }

  if (!document) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{document.documentName}</h2>
            <p className="text-sm text-muted-foreground">
              {document.fileName}
              {document.fileSize && ` (${formatFileSize(document.fileSize)})`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isImage && (
              <>
                <Button size="sm" variant="outline" onClick={handleZoomOut} title="Zoom out">
                  <ZoomOutIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <Button size="sm" variant="outline" onClick={handleZoomIn} title="Zoom in">
                  <ZoomInIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetZoom} title="Reset zoom">
                  <ResetIcon className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-200 mx-1" />
              </>
            )}
            <Button
              size="sm"
              onClick={() => onDownload(document.id, document.fileName)}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <CloseIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ErrorIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => onDownload(document.id, document.fileName)}
                >
                  Download Instead
                </Button>
              </div>
            </div>
          ) : previewUrl ? (
            <>
              {isPdf && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileIcon className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-2">
                      {document.documentName}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      PDF files open in a new browser tab for best viewing experience
                    </p>
                    <Button
                      size="lg"
                      onClick={() => {
                        if (previewUrl) {
                          window.open(previewUrl, '_blank')
                        }
                      }}
                    >
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      Open PDF
                    </Button>
                  </div>
                </div>
              )}

              {isImage && (
                <div
                  className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  <img
                    src={previewUrl}
                    alt={document.documentName}
                    className="max-w-none transition-transform duration-100"
                    style={{
                      transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                    }}
                    draggable={false}
                  />
                </div>
              )}

              {!isPdf && !isImage && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Preview not available for this file type
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {document.mimeType || 'Unknown type'}
                    </p>
                    <Button onClick={() => onDownload(document.id, document.fileName)}>
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer hint for images */}
        {isImage && previewUrl && !isLoading && (
          <div className="px-4 py-2 border-t bg-gray-50 text-center">
            <p className="text-xs text-muted-foreground">
              Use Ctrl/Cmd + scroll to zoom. Click and drag to pan when zoomed in.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Icons
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
    </svg>
  )
}

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" />
    </svg>
  )
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}
