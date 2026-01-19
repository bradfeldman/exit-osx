'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
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
  notes: string | null
  createdAt: string
  linkedTaskId: string | null
  linkedTask?: {
    id: string
    title: string
    status: string
  } | null
  uploadedBy?: {
    id: string
    name: string | null
    email: string
  } | null
}

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  FINANCIAL: { label: 'Financial Documents', icon: <DollarIcon className="h-5 w-5" />, color: 'bg-blue-100 text-blue-700' },
  LEGAL: { label: 'Legal & Corporate', icon: <ScaleIcon className="h-5 w-5" />, color: 'bg-purple-100 text-purple-700' },
  OPERATIONS: { label: 'Operations', icon: <GearIcon className="h-5 w-5" />, color: 'bg-yellow-100 text-yellow-700' },
  CUSTOMERS: { label: 'Customers & Sales', icon: <UsersIcon className="h-5 w-5" />, color: 'bg-green-100 text-green-700' },
  EMPLOYEES: { label: 'Human Resources', icon: <TeamIcon className="h-5 w-5" />, color: 'bg-orange-100 text-orange-700' },
  IP: { label: 'Intellectual Property', icon: <LightbulbIcon className="h-5 w-5" />, color: 'bg-pink-100 text-pink-700' },
  TASK_PROOF: { label: 'Internal Documents', icon: <CheckIcon className="h-5 w-5" />, color: 'bg-emerald-100 text-emerald-700' },
  CUSTOM: { label: 'Custom Documents', icon: <FolderIcon className="h-5 w-5" />, color: 'bg-gray-100 text-gray-700' },
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
  const [documents, setDocuments] = useState<DataRoomDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState<DataRoomDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newDocument, setNewDocument] = useState({
    category: 'CUSTOM',
    documentName: '',
    description: '',
    updateFrequency: 'AS_NEEDED',
  })

  const fetchDocuments = useCallback(async () => {
    if (!selectedCompanyId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/data-room`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      } else {
        console.error('Error fetching documents:', res.status)
        setDocuments([])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleFileSelect = async (docId: string, file: File) => {
    if (!selectedCompanyId) return

    setUploadingDocId(docId)

    try {
      // 1. Get signed upload URL
      const uploadRes = await fetch(`/api/companies/${selectedCompanyId}/data-room/${docId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
        }),
      })

      if (!uploadRes.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, publicUrl } = await uploadRes.json()

      // 2. Upload file to Supabase Storage
      const uploadToStorage = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadToStorage.ok) throw new Error('Failed to upload file')

      // 3. Update document record with file info
      const updateRes = await fetch(`/api/companies/${selectedCompanyId}/data-room/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFileUpload: true,
          fileUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })

      if (!updateRes.ok) throw new Error('Failed to update document')

      // Refresh documents
      await fetchDocuments()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploadingDocId(null)
    }
  }

  const handleAddDocument = async () => {
    if (!selectedCompanyId || !newDocument.documentName) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/data-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })

      if (res.ok) {
        setShowAddDialog(false)
        setNewDocument({
          category: 'CUSTOM',
          documentName: '',
          description: '',
          updateFrequency: 'AS_NEEDED',
        })
        await fetchDocuments()
      }
    } catch (error) {
      console.error('Error adding document:', error)
    }
  }

  const handleUpdateDocument = async () => {
    if (!selectedCompanyId || !showEditDialog) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/data-room/${showEditDialog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: showEditDialog.documentName,
          description: showEditDialog.description,
          updateFrequency: showEditDialog.updateFrequency,
          notes: showEditDialog.notes,
        }),
      })

      if (res.ok) {
        setShowEditDialog(null)
        await fetchDocuments()
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
      await fetch(`/api/companies/${selectedCompanyId}/data-room/${docId}`, {
        method: 'DELETE',
      })
      await fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
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

  // Group documents by category
  const groupedDocs = documents.reduce((acc, doc) => {
    const cat = doc.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {} as Record<string, DataRoomDocument[]>)

  // Calculate stats
  const totalDocs = documents.length
  const uploadedDocs = documents.filter(d => d.fileUrl).length
  const overdueDocs = documents.filter(d => d.status === 'OVERDUE').length
  const needsUpdateDocs = documents.filter(d => d.status === 'NEEDS_UPDATE').length
  const completionPercent = totalDocs > 0 ? Math.round((uploadedDocs / totalDocs) * 100) : 0

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
            handleFileSelect(docId, file)
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
        <Button onClick={() => setShowAddDialog(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-2xl font-semibold">{completionPercent}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uploaded</p>
                <p className="text-2xl font-semibold">{uploadedDocs} / {totalDocs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DocumentIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Update</p>
                <p className="text-2xl font-semibold">{needsUpdateDocs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-semibold text-red-600">{overdueDocs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Categories */}
      <div className="space-y-4">
        {Object.entries(CATEGORY_INFO).map(([category, info]) => {
          const categoryDocs = groupedDocs[category] || []
          if (categoryDocs.length === 0) return null

          const isExpanded = expandedCategory === category
          const uploadedCount = categoryDocs.filter(d => d.fileUrl).length
          const overdueCount = categoryDocs.filter(d => d.status === 'OVERDUE').length

          return (
            <Card key={category} className="overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full"
              >
                <CardHeader className="pb-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${info.color}`}>
                        {info.icon}
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-base">{info.label}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {category === 'TASK_PROOF' ? (
                            `${categoryDocs.length} document${categoryDocs.length === 1 ? '' : 's'} from tasks`
                          ) : (
                            <>
                              {uploadedCount}/{categoryDocs.length} documents uploaded
                              {overdueCount > 0 && (
                                <span className="text-red-600 ml-2">({overdueCount} overdue)</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronIcon className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4 space-y-3">
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{doc.documentName}</p>
                            {doc.isCustom && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">Custom</span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                          )}
                          {/* Show different info for task proof docs vs regular docs */}
                          {doc.category === 'TASK_PROOF' ? (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              {doc.linkedTask && (
                                <span className="flex items-center gap-1">
                                  <span className="text-emerald-600">Task:</span>
                                  <span className="truncate max-w-[200px]">{doc.linkedTask.title}</span>
                                </span>
                              )}
                              {doc.uploadedBy && (
                                <span>
                                  Uploaded by: {doc.uploadedBy.name || doc.uploadedBy.email}
                                </span>
                              )}
                              {doc.createdAt && (
                                <span>
                                  {formatDate(doc.createdAt)}
                                </span>
                              )}
                            </div>
                          ) : (
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
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {(doc.fileUrl || doc.filePath) && (
                            <span className={`text-xs px-2 py-1 rounded ${STATUS_STYLES[doc.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[doc.status]?.text || 'text-gray-700'}`}>
                              {STATUS_STYLES[doc.status]?.label || 'Uploaded'}
                            </span>
                          )}

                          {/* For task proofs, use signed URL fetch */}
                          {doc.category === 'TASK_PROOF' && (doc.filePath || doc.status === 'CURRENT') && doc.linkedTaskId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  const response = await fetch(`/api/tasks/${doc.linkedTaskId}/proof`)
                                  if (response.ok) {
                                    const data = await response.json()
                                    const docWithUrl = data.proofDocuments?.find((d: { id: string; signedUrl?: string }) => d.id === doc.id)
                                    if (docWithUrl?.signedUrl) {
                                      window.open(docWithUrl.signedUrl, '_blank')
                                    } else {
                                      alert('Unable to get download URL. The file may not exist.')
                                    }
                                  } else {
                                    alert('Failed to fetch document.')
                                  }
                                } catch (err) {
                                  console.error('Error fetching document URL:', err)
                                  alert('Error fetching document.')
                                }
                              }}
                            >
                              View / Download
                            </Button>
                          ) : doc.fileUrl ? (
                            <>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                                title="View document"
                              >
                                <ExternalLinkIcon className="h-4 w-4 text-gray-600" />
                              </a>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
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
                          ) : doc.category !== 'TASK_PROOF' ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (fileInputRef.current) {
                                  fileInputRef.current.dataset.docId = doc.id
                                  fileInputRef.current.click()
                                }
                              }}
                              disabled={uploadingDocId === doc.id}
                            >
                              {uploadingDocId === doc.id ? 'Uploading...' : 'Upload'}
                            </Button>
                          ) : null}

                          {doc.category !== 'TASK_PROOF' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowEditDialog(doc)
                              }}
                              className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                              title="Edit"
                            >
                              <EditIcon className="h-4 w-4 text-gray-600" />
                            </button>
                          )}

                          {(doc.isCustom || doc.fileUrl) && doc.category !== 'TASK_PROOF' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDocument(doc.id, doc.isCustom)
                              }}
                              className="p-2 hover:bg-red-100 rounded-md transition-colors"
                              title={doc.isCustom ? 'Delete' : 'Remove file'}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          )}

                          {/* Delete button for task proof documents */}
                          {doc.category === 'TASK_PROOF' && doc.linkedTaskId && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) return
                                try {
                                  const response = await fetch(`/api/tasks/${doc.linkedTaskId}/proof?documentId=${doc.id}`, {
                                    method: 'DELETE',
                                  })
                                  if (response.ok) {
                                    await fetchDocuments()
                                  } else {
                                    alert('Failed to delete document')
                                  }
                                } catch (err) {
                                  console.error('Error deleting document:', err)
                                  alert('Error deleting document')
                                }
                              }}
                              className="p-2 hover:bg-red-100 rounded-md transition-colors"
                              title="Delete document"
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add Document Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newDocument.category}
                onValueChange={(v) => setNewDocument({ ...newDocument, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.label}</SelectItem>
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
            <Button onClick={handleAddDocument} disabled={!newDocument.documentName}>Add Document</Button>
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
              {showEditDialog.fileUrl && (
                <div className="text-sm text-muted-foreground">
                  <p>Current file: {showEditDialog.fileName}</p>
                  <p>Size: {showEditDialog.fileSize ? formatFileSize(showEditDialog.fileSize) : 'Unknown'}</p>
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
    </div>
  )
}

// Icons
function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
    </svg>
  )
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  )
}

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

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
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

function ExternalLinkIcon({ className }: { className?: string }) {
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
