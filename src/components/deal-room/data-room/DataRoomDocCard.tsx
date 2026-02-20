'use client'

import { DataRoomCategory } from '@prisma/client'
import {
  FileText,
  DollarSign,
  Scale,
  Settings,
  Users,
  UserCheck,
  Shield,
  Receipt,
  TrendingUp,
  Code,
  Building,
  FolderOpen,
  GripVertical,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const CATEGORY_ICONS: Record<DataRoomCategory, React.ComponentType<{ className?: string }>> = {
  FINANCIAL: DollarSign,
  LEGAL: Scale,
  OPERATIONS: Settings,
  CUSTOMERS: Users,
  EMPLOYEES: UserCheck,
  IP: Shield,
  TAX: Receipt,
  SALES_MARKETING: TrendingUp,
  TECHNOLOGY: Code,
  REAL_ESTATE: Building,
  CUSTOM: FolderOpen,
  TASK_PROOF: FileText,
  ENVIRONMENTAL: FileText,
  INSURANCE: FileText,
  CORPORATE: FileText,
}

const CATEGORY_LABELS: Record<DataRoomCategory, string> = {
  FINANCIAL: 'Financial',
  LEGAL: 'Legal',
  OPERATIONS: 'Operations',
  CUSTOMERS: 'Customers',
  EMPLOYEES: 'Employees',
  IP: 'IP',
  TAX: 'Tax',
  SALES_MARKETING: 'Sales',
  TECHNOLOGY: 'Tech',
  REAL_ESTATE: 'Real Estate',
  CUSTOM: 'Custom',
  TASK_PROOF: 'Evidence',
  ENVIRONMENTAL: 'Env',
  INSURANCE: 'Insurance',
  CORPORATE: 'Corporate',
}

export interface DataRoomDoc {
  id: string
  documentName: string
  category: DataRoomCategory
  fileName: string | null
  fileUrl: string | null
  dataRoomStage: string | null
}

interface DataRoomDocCardProps {
  doc: DataRoomDoc
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

export function DataRoomDocCard({ doc, isDragging, onDragStart, onDragEnd }: DataRoomDocCardProps) {
  const Icon = CATEGORY_ICONS[doc.category] || FileText

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', doc.id)
        onDragStart(e)
      }}
      onDragEnd={onDragEnd}
      className={`group flex items-start gap-2 p-2.5 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all
        ${isDragging ? 'opacity-40 scale-95' : 'hover:border-border hover:shadow-sm'}
        border-border/40`}
    >
      <GripVertical className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {doc.documentName}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
            <Icon className="w-3 h-3" />
            {CATEGORY_LABELS[doc.category]}
          </Badge>
          {doc.fileUrl ? (
            <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" title="File uploaded" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" title="No file" />
          )}
        </div>
      </div>
    </div>
  )
}
