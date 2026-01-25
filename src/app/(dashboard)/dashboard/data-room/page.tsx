'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { toast } from '@/components/ui/toaster'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_INFO, STAGE_INFO, DataRoomStageType } from '@/lib/dataroom/constants'
import { AccessManager } from '@/components/dataroom/AccessManager'
import { ActivityFeed } from '@/components/dataroom/ActivityFeed'
import { DocumentPreview } from '@/components/dataroom/DocumentPreview'
import { VersionHistory } from '@/components/dataroom/VersionHistory'
import { SearchFilters, FilterState } from '@/components/dataroom/SearchFilters'
import { NotificationBell } from '@/components/dataroom/NotificationBell'
import { AnalyticsPanel } from '@/components/dataroom/AnalyticsPanel'
import { DocumentAnalytics } from '@/components/dataroom/DocumentAnalytics'

// Stage order for comparison (lower index = earlier stage)
const STAGE_ORDER: DataRoomStageType[] = ['PREPARATION', 'TEASER', 'POST_NDA', 'DUE_DILIGENCE', 'CLOSED']

function canAccessStage(userMaxStage: DataRoomStageType | null, folderMinStage: DataRoomStageType): boolean {
  // If no user stage restriction (internal user), they can see everything
  if (!userMaxStage) return true

  const userStageIndex = STAGE_ORDER.indexOf(userMaxStage)
  const folderStageIndex = STAGE_ORDER.indexOf(folderMinStage)

  // User can access if their max stage is >= folder's min stage
  return userStageIndex >= folderStageIndex
}

interface DataRoomFolder {
  id: string
  name: string
  category: string
  sortOrder: number
  minStage: string
  documentCount: number
  children: DataRoomFolder[]
}

interface DataRoomDocument {
  id: string
  category: string
  documentName: string
  description: string | null
  fileUrl: string | null
  filePath: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  updateFrequency: string
  lastUpdatedAt: string | null
  nextUpdateDue: string | null
  status: string
  isRequired: boolean
  isCustom: boolean
  isConfidential: boolean
  notes: string | null
  version: number
  folderId: string | null
  folder?: { id: string; name: string; category: string } | null
  linkedTaskId: string | null
  linkedTask?: { id: string; title: string; status: string } | null
  uploadedBy?: { id: string; name: string | null; email: string } | null
  tags?: Array<{ tag: { id: string; name: string; color: string } }>
}

interface DataRoom {
  id: string
  name: string
  stage: string
  folders: DataRoomFolder[]
}

interface ReadinessScore {
  score: number
  byCategory: Record<string, { uploaded: number; expected: number; percentage: number }>
  missingCritical: string[]
}

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
  AS_NEEDED: 'As Needed',
  ONE_TIME: 'One Time',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CURRENT: { bg: 'bg-green-100', text: 'text-green-700', label: 'Current' },
  NEEDS_UPDATE: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Update Soon' },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays} days`
  if (diffDays <= 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
  return `Due ${formatDate(dateStr)}`
}

export default function DataRoomPage() {
  const { selectedCompanyId, selectedCompany } = useCompany()
  const [dataRoom, setDataRoom] = useState<DataRoom | null>(null)
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null)
  const [documents, setDocuments] = useState<DataRoomDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFolder, setSelectedFolder] = useState<DataRoomFolder | null>(null)
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState<DataRoomDocument | null>(null)
  const [showAccessManager, setShowAccessManager] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [userMaxStage, _setUserMaxStage] = useState<DataRoomStageType | null>(null) // null = internal user (full access)
  const [previewDocument, setPreviewDocument] = useState<DataRoomDocument | null>(null)
  const [versionHistoryDocument, setVersionHistoryDocument] = useState<DataRoomDocument | null>(null)
  const [_filters, setFilters] = useState<FilterState | null>(null)
  const [searchResults, setSearchResults] = useState<DataRoomDocument[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsDocument, setAnalyticsDocument] = useState<DataRoomDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newDocument, setNewDocument] = useState({
    folderId: '',
    documentName: '',
    description: '',
    updateFrequency: 'AS_NEEDED',
  })

  // Drag and drop state
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [dragOverDocList, setDragOverDocList] = useState(false)
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fetchDataRoom = useCallback(async () => {
    if (!selectedCompanyId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom`)
      if (res.ok) {
        const data = await res.json()
        setDataRoom(data.dataRoom)
        setReadiness(data.readiness)
        // Expand first accessible folder by default
        if (data.dataRoom?.folders?.length > 0) {
          const accessibleFolders = data.dataRoom.folders.filter(
            (f: DataRoomFolder) => canAccessStage(userMaxStage, f.minStage as DataRoomStageType)
          )
          if (accessibleFolders.length > 0) {
            setExpandedFolders(new Set([accessibleFolders[0].id]))
            setSelectedFolder(accessibleFolders[0])
          }
        }
      } else {
        console.error('Error fetching data room:', res.status)
      }
    } catch (error) {
      console.error('Error fetching data room:', error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  const fetchFolderDocuments = useCallback(async (folderId: string) => {
    if (!selectedCompanyId) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents?folderId=${folderId}`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }, [selectedCompanyId])

  const handleFiltersChange = useCallback(async (newFilters: FilterState) => {
    setFilters(newFilters)

    // Check if any filter is active
    const hasActiveFilters =
      newFilters.search ||
      newFilters.status ||
      newFilters.category ||
      newFilters.hasFile ||
      newFilters.tags.length > 0 ||
      newFilters.updatedAfter ||
      newFilters.updatedBefore

    if (!hasActiveFilters) {
      // Clear search results and show folder view
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    if (!selectedCompanyId) return

    setIsSearching(true)

    try {
      const params = new URLSearchParams()

      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status)
      if (newFilters.category && newFilters.category !== 'all') params.set('category', newFilters.category)
      if (newFilters.hasFile && newFilters.hasFile !== 'all') params.set('hasFile', newFilters.hasFile)
      if (newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','))
      if (newFilters.updatedAfter) params.set('updatedAfter', newFilters.updatedAfter)
      if (newFilters.updatedBefore) params.set('updatedBefore', newFilters.updatedBefore)

      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.documents || [])
      }
    } catch (error) {
      console.error('Error searching documents:', error)
    } finally {
      setIsSearching(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchDataRoom()
  }, [fetchDataRoom])

  useEffect(() => {
    if (selectedFolder) {
      fetchFolderDocuments(selectedFolder.id)
    }
  }, [selectedFolder, fetchFolderDocuments])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleFileUpload = async (docId: string, file: File) => {
    if (!selectedCompanyId) return

    setUploadingDocId(docId)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${docId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Upload failed')
      }

      // Refresh documents
      if (selectedFolder) {
        await fetchFolderDocuments(selectedFolder.id)
      }
      await fetchDataRoom()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file. Please try again.')
    } finally {
      setUploadingDocId(null)
    }
  }

  const handleAddDocument = async () => {
    if (!selectedCompanyId || !newDocument.documentName || !newDocument.folderId) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })

      if (res.ok) {
        setShowAddDialog(false)
        setNewDocument({ folderId: '', documentName: '', description: '', updateFrequency: 'AS_NEEDED' })
        if (selectedFolder) {
          await fetchFolderDocuments(selectedFolder.id)
        }
        await fetchDataRoom()
      }
    } catch (error) {
      console.error('Error adding document:', error)
    }
  }

  const handleUpdateDocument = async () => {
    if (!selectedCompanyId || !showEditDialog) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${showEditDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: showEditDialog.documentName,
          description: showEditDialog.description,
          updateFrequency: showEditDialog.updateFrequency,
          notes: showEditDialog.notes,
          isConfidential: showEditDialog.isConfidential,
        }),
      })

      if (res.ok) {
        setShowEditDialog(null)
        if (selectedFolder) {
          await fetchFolderDocuments(selectedFolder.id)
        }
      }
    } catch (error) {
      console.error('Error updating document:', error)
    }
  }

  const handleDeleteDocument = async (docId: string, isCustom: boolean) => {
    if (!selectedCompanyId) return

    const confirmMsg = isCustom
      ? 'Are you sure you want to delete this document?'
      : 'Are you sure you want to remove the uploaded file?'

    if (!confirm(confirmMsg)) return

    try {
      if (isCustom) {
        await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${docId}`, {
          method: 'DELETE',
        })
      } else {
        await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${docId}/upload`, {
          method: 'DELETE',
        })
      }
      if (selectedFolder) {
        await fetchFolderDocuments(selectedFolder.id)
      }
      await fetchDataRoom()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleDownload = async (docId: string, fileName?: string | null) => {
    if (!selectedCompanyId) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${docId}/download`)

      if (!res.ok) {
        console.error('Error getting download')
        toast.error('Failed to download file')
        return
      }

      const contentType = res.headers.get('Content-Type')

      // If response is a PDF blob (watermarked), download it directly
      if (contentType === 'application/pdf') {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName || 'document.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // For other files, use the signed URL
        const data = await res.json()
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading:', error)
      alert('Failed to download file')
    }
  }

  // Drag and drop handlers
  const handleFileDrop = async (files: FileList, folderId: string) => {
    if (!selectedCompanyId || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Create document placeholder
        const createRes = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId,
            documentName: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for display name
            description: '',
            updateFrequency: 'AS_NEEDED',
          }),
        })

        if (!createRes.ok) {
          console.error('Failed to create document')
          continue
        }

        const { document: newDoc } = await createRes.json()

        // Upload file to the document
        const formData = new FormData()
        formData.append('file', file)

        await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${newDoc.id}/upload`, {
          method: 'POST',
          body: formData,
        })
      }

      // Refresh data
      if (selectedFolder) {
        await fetchFolderDocuments(selectedFolder.id)
      }
      await fetchDataRoom()
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Failed to upload some files')
    } finally {
      setIsUploading(false)
      setDragOverFolderId(null)
      setDragOverDocList(false)
    }
  }

  const handleMoveDocument = async (docId: string, targetFolderId: string) => {
    if (!selectedCompanyId) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/dataroom/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      })

      if (res.ok) {
        // Refresh data
        if (selectedFolder) {
          await fetchFolderDocuments(selectedFolder.id)
        }
        await fetchDataRoom()
      }
    } catch (error) {
      console.error('Error moving document:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleFolderDragEnter = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(folderId)
  }

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear if we're leaving the folder element entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverFolderId(null)
    }
  }

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)

    // Check if it's a document being moved
    const docId = e.dataTransfer.getData('application/x-document-id')
    if (docId) {
      await handleMoveDocument(docId, folderId)
      return
    }

    // Otherwise it's files from the computer
    if (e.dataTransfer.files.length > 0) {
      await handleFileDrop(e.dataTransfer.files, folderId)
    }
  }

  const handleDocListDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setDragOverDocList(true)
    }
  }

  const handleDocListDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverDocList(false)
    }
  }

  const handleDocListDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverDocList(false)

    if (!selectedFolder) return

    // Only handle file drops, not document moves
    if (e.dataTransfer.files.length > 0 && !e.dataTransfer.getData('application/x-document-id')) {
      await handleFileDrop(e.dataTransfer.files, selectedFolder.id)
    }
  }

  const handleDocumentDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData('application/x-document-id', docId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingDocId(docId)
  }

  const handleDocumentDragEnd = () => {
    setDraggingDocId(null)
    setDragOverFolderId(null)
  }

  const canPreview = (doc: DataRoomDocument) => {
    if (!doc.filePath) return false
    const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf')
    const isImage = doc.mimeType?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(doc.fileName || '')
    return isPdf || isImage
  }

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select a company to view the data room.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading data room...</p>
      </div>
    )
  }

  const stageInfo = dataRoom?.stage ? STAGE_INFO[dataRoom.stage as keyof typeof STAGE_INFO] : null

  return (
    <div className="p-6 space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const docId = fileInputRef.current?.dataset.docId
          if (file && docId) {
            handleFileUpload(docId, file)
          }
          e.target.value = ''
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Data Room</h1>
          <p className="text-muted-foreground mt-1">
            Organize documents for buyer due diligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stageInfo && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${stageInfo.color}-100 text-${stageInfo.color}-700`}>
              {stageInfo.label}
            </span>
          )}
          {selectedCompanyId && (
            <NotificationBell
              companyId={selectedCompanyId}
              onNotificationClick={(notification) => {
                // If notification is about a document, could navigate to it
                console.log('Notification clicked:', notification)
              }}
            />
          )}
          <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
            <ChartIcon className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" onClick={() => setShowActivityFeed(true)}>
            <ActivityIcon className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <Button variant="outline" onClick={() => setShowAccessManager(true)}>
            <UsersIcon className="h-4 w-4 mr-2" />
            Manage Access
          </Button>
          <Button onClick={() => {
            setNewDocument({ ...newDocument, folderId: selectedFolder?.id || '' })
            setShowAddDialog(true)
          }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      </div>

      {/* Readiness Score */}
      {readiness && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Readiness Score</p>
                  <p className="text-2xl font-semibold">{readiness.score}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${readiness.score}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Folders</p>
              <p className="text-2xl font-semibold">{dataRoom?.folders?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="text-2xl font-semibold">
                {dataRoom?.folders?.reduce((sum, f) => sum + f.documentCount + f.children.reduce((cs, c) => cs + c.documentCount, 0), 0) || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Missing Critical</p>
              <p className="text-2xl font-semibold text-red-600">{readiness.missingCritical.length}</p>
              {readiness.missingCritical.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {readiness.missingCritical.join(', ')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      {selectedCompanyId && (
        <SearchFilters
          companyId={selectedCompanyId}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Analytics Panel */}
      {showAnalytics && selectedCompanyId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Engagement Analytics</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(false)}>
              <CloseIcon className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <AnalyticsPanel
              companyId={selectedCompanyId}
              onDocumentClick={(docId) => {
                // Find the document and show its analytics
                const doc = documents.find((d) => d.id === docId) || searchResults?.find((d) => d.id === docId)
                if (doc) {
                  setAnalyticsDocument(doc)
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content - Folder Tree + Documents */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Folder Tree */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Folders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {dataRoom?.folders
                ?.filter((folder) => canAccessStage(userMaxStage, folder.minStage as DataRoomStageType))
                .map((folder) => {
                const categoryInfo = CATEGORY_INFO[folder.category as keyof typeof CATEGORY_INFO]
                const isExpanded = expandedFolders.has(folder.id)
                const isSelected = selectedFolder?.id === folder.id
                const isDragOver = dragOverFolderId === folder.id

                // Filter children based on stage access
                const accessibleChildren = folder.children.filter((child) =>
                  canAccessStage(userMaxStage, child.minStage as DataRoomStageType)
                )

                return (
                  <div key={folder.id}>
                    <button
                      onClick={() => {
                        setSelectedFolder(folder)
                        if (accessibleChildren.length > 0) {
                          toggleFolder(folder.id)
                        }
                      }}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleFolderDragEnter(e, folder.id)}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={(e) => handleFolderDrop(e, folder.id)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                      } ${isDragOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}`}
                    >
                      <div className={`p-1.5 rounded ${categoryInfo?.color || 'bg-gray-100 text-gray-700'}`}>
                        <FolderIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.documentCount} docs
                          {accessibleChildren.length > 0 && ` | ${accessibleChildren.length} subfolders`}
                        </p>
                      </div>
                      {isDragOver && (
                        <span className="text-xs text-primary font-medium">Drop here</span>
                      )}
                      {accessibleChildren.length > 0 && !isDragOver && (
                        <ChevronIcon className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {isExpanded && accessibleChildren.map((child) => {
                      const isChildSelected = selectedFolder?.id === child.id
                      const isChildDragOver = dragOverFolderId === child.id
                      return (
                        <button
                          key={child.id}
                          onClick={() => setSelectedFolder(child)}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleFolderDragEnter(e, child.id)}
                          onDragLeave={handleFolderDragLeave}
                          onDrop={(e) => handleFolderDrop(e, child.id)}
                          className={`w-full flex items-center gap-3 p-3 pl-10 hover:bg-gray-50 transition-colors ${
                            isChildSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                          } ${isChildDragOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}`}
                        >
                          <FolderIcon className="h-4 w-4 text-gray-400" />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm truncate">{child.name}</p>
                            <p className="text-xs text-muted-foreground">{child.documentCount} docs</p>
                          </div>
                          {isChildDragOver && (
                            <span className="text-xs text-primary font-medium">Drop here</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {searchResults !== null
                  ? 'Search Results'
                  : selectedFolder
                  ? selectedFolder.name
                  : 'Documents'}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                    Searching...
                  </span>
                ) : searchResults !== null ? (
                  `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                ) : selectedFolder ? (
                  `${documents.length} document${documents.length !== 1 ? 's' : ''}`
                ) : null}
              </span>
            </div>
          </CardHeader>
          <CardContent
            onDragOver={handleDragOver}
            onDragEnter={handleDocListDragEnter}
            onDragLeave={handleDocListDragLeave}
            onDrop={handleDocListDrop}
            className={`min-h-[200px] transition-colors ${dragOverDocList ? 'bg-primary/10 ring-2 ring-primary ring-dashed rounded-lg' : ''}`}
          >
            {/* Upload indicator */}
            {isUploading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className="text-sm text-blue-700">Uploading files...</span>
              </div>
            )}

            {/* Drop zone overlay */}
            {dragOverDocList && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg pointer-events-none z-10">
                <div className="text-center">
                  <UploadIcon className="h-12 w-12 mx-auto text-primary mb-2" />
                  <p className="text-primary font-medium">Drop files to upload</p>
                </div>
              </div>
            )}

            {/* Determine which documents to display */}
            {(() => {
              const displayDocs = searchResults !== null ? searchResults : documents
              const showEmptyFolder = searchResults === null && !selectedFolder
              const showNoResults = searchResults !== null && searchResults.length === 0
              const showEmptyFolderDocs = searchResults === null && selectedFolder && documents.length === 0

              if (showEmptyFolder) {
                return <p className="text-muted-foreground text-center py-8">Select a folder to view documents</p>
              }

              if (showNoResults) {
                return (
                  <div className="text-center py-8">
                    <SearchIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground">No documents match your search</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
                  </div>
                )
              }

              if (showEmptyFolderDocs) {
                return (
                  <div className="text-center py-8">
                    <UploadIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground">No documents in this folder</p>
                    <p className="text-sm text-muted-foreground mt-1">Drag and drop files here or click to add</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setNewDocument({ ...newDocument, folderId: selectedFolder.id })
                        setShowAddDialog(true)
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                )
              }

              // Show documents
              return (
                <div className="space-y-3 relative">
                  {displayDocs.map((doc) => (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleDocumentDragStart(e, doc.id)}
                    onDragEnd={handleDocumentDragEnd}
                    className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-grab active:cursor-grabbing transition-opacity ${
                      draggingDocId === doc.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{doc.documentName}</p>
                        {doc.isCustom && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">Custom</span>
                        )}
                        {doc.isConfidential && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Confidential</span>
                        )}
                        {doc.version > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setVersionHistoryDocument(doc)
                            }}
                            className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                            title="View version history"
                          >
                            <HistoryIcon className="h-3 w-3" />
                            v{doc.version}
                          </button>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Update: {FREQUENCY_LABELS[doc.updateFrequency]}</span>
                        {(doc.fileUrl || doc.filePath) && (
                          <>
                            <span>|</span>
                            <span>Last updated: {formatDate(doc.lastUpdatedAt)}</span>
                            {doc.nextUpdateDue && doc.updateFrequency !== 'ONE_TIME' && doc.updateFrequency !== 'AS_NEEDED' && (
                              <>
                                <span>|</span>
                                <span className={doc.status === 'OVERDUE' ? 'text-red-600' : doc.status === 'NEEDS_UPDATE' ? 'text-yellow-600' : ''}>
                                  {getRelativeTime(doc.nextUpdateDue)}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {doc.tags.map((t) => (
                            <span
                              key={t.tag.id}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {(doc.fileUrl || doc.filePath) && (
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_STYLES[doc.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[doc.status]?.text || 'text-gray-700'}`}>
                          {STATUS_STYLES[doc.status]?.label || 'Uploaded'}
                        </span>
                      )}

                      {doc.filePath ? (
                        <>
                          {canPreview(doc) && (
                            <button
                              onClick={() => setPreviewDocument(doc)}
                              className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                              title="Preview document"
                            >
                              <EyeIcon className="h-4 w-4 text-gray-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc.id, doc.fileName)}
                            className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                            title="Download document"
                          >
                            <DownloadIcon className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setAnalyticsDocument(doc)}
                            className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                            title="View analytics"
                          >
                            <ChartIcon className="h-4 w-4 text-gray-600" />
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.dataset.docId = doc.id
                                fileInputRef.current.click()
                              }
                            }}
                            disabled={uploadingDocId === doc.id}
                          >
                            {uploadingDocId === doc.id ? 'Uploading...' : 'Replace'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.dataset.docId = doc.id
                              fileInputRef.current.click()
                            }
                          }}
                          disabled={uploadingDocId === doc.id}
                        >
                          {uploadingDocId === doc.id ? 'Uploading...' : 'Upload'}
                        </Button>
                      )}

                      <button
                        onClick={() => setShowEditDialog(doc)}
                        className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                        title="Edit"
                      >
                        <EditIcon className="h-4 w-4 text-gray-600" />
                      </button>

                      {(doc.isCustom || doc.filePath) && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.isCustom)}
                          className="p-2 hover:bg-red-100 rounded-md transition-colors"
                          title={doc.isCustom ? 'Delete' : 'Remove file'}
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select
                value={newDocument.folderId}
                onValueChange={(v) => setNewDocument({ ...newDocument, folderId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {dataRoom?.folders
                    ?.filter((folder) => canAccessStage(userMaxStage, folder.minStage as DataRoomStageType))
                    .flatMap((folder) => [
                    { id: folder.id, name: folder.name },
                    ...folder.children
                      .filter((child) => canAccessStage(userMaxStage, child.minStage as DataRoomStageType))
                      .map((child) => ({
                      id: child.id,
                      name: `  ${child.name}`,
                    })),
                  ]).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={newDocument.documentName}
                onChange={(e) => setNewDocument({ ...newDocument, documentName: e.target.value })}
                placeholder="e.g., Bank Statements"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="Brief description of this document"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Update Frequency</Label>
              <Select
                value={newDocument.updateFrequency}
                onValueChange={(v) => setNewDocument({ ...newDocument, updateFrequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDocument} disabled={!newDocument.documentName || !newDocument.folderId}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          {showEditDialog && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input
                  value={showEditDialog.documentName}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, documentName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={showEditDialog.description || ''}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Update Frequency</Label>
                <Select
                  value={showEditDialog.updateFrequency}
                  onValueChange={(v) => setShowEditDialog({ ...showEditDialog, updateFrequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={showEditDialog.notes || ''}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, notes: e.target.value })}
                  placeholder="Internal notes about this document"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isConfidential"
                  checked={showEditDialog.isConfidential}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, isConfidential: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isConfidential">Mark as confidential</Label>
              </div>
              {showEditDialog.filePath && (
                <div className="text-sm text-muted-foreground">
                  <p>Current file: {showEditDialog.fileName}</p>
                  <p>Size: {showEditDialog.fileSize ? formatFileSize(showEditDialog.fileSize) : 'Unknown'}</p>
                  <p>Version: {showEditDialog.version}</p>
                  <p>Last updated: {formatDate(showEditDialog.lastUpdatedAt)}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(null)}>Cancel</Button>
            <Button onClick={handleUpdateDocument}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Manager */}
      {selectedCompanyId && (
        <AccessManager
          companyId={selectedCompanyId}
          isOpen={showAccessManager}
          onClose={() => setShowAccessManager(false)}
        />
      )}

      {/* Activity Feed */}
      {selectedCompanyId && (
        <ActivityFeed
          companyId={selectedCompanyId}
          isOpen={showActivityFeed}
          onClose={() => setShowActivityFeed(false)}
        />
      )}

      {/* Document Preview */}
      {selectedCompanyId && (
        <DocumentPreview
          companyId={selectedCompanyId}
          document={previewDocument}
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Version History */}
      {selectedCompanyId && (
        <VersionHistory
          companyId={selectedCompanyId}
          document={versionHistoryDocument}
          isOpen={!!versionHistoryDocument}
          onClose={() => setVersionHistoryDocument(null)}
          onVersionRestored={async () => {
            if (selectedFolder) {
              await fetchFolderDocuments(selectedFolder.id)
            }
            await fetchDataRoom()
          }}
        />
      )}

      {/* Document Analytics */}
      {selectedCompanyId && analyticsDocument && (
        <DocumentAnalytics
          companyId={selectedCompanyId}
          documentId={analyticsDocument.id}
          documentName={analyticsDocument.documentName}
          onClose={() => setAnalyticsDocument(null)}
        />
      )}
    </div>
  )
}

// Icons
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function _ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
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
