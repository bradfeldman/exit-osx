'use client'

import { useState } from 'react'
import { BuyerCard, type PipelineBuyer } from './BuyerCard'

interface PipelineColumnProps {
  visualStage: string
  label: string
  buyerCount: number
  buyers: PipelineBuyer[]
  onBuyerClick: (buyerId: string) => void
  onChangeStage: (buyerId: string) => void
  onDragStart: (buyerId: string) => void
  onDrop: (buyerId: string, targetVisualStage: string) => void
  isDragging: boolean
  draggedBuyerId: string | null
}

export function PipelineColumn({
  visualStage,
  label,
  buyerCount,
  buyers,
  onBuyerClick,
  onChangeStage,
  onDragStart,
  onDrop,
  isDragging,
  draggedBuyerId,
}: PipelineColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (draggedBuyerId) {
      onDrop(draggedBuyerId, visualStage)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        {buyerCount > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {buyerCount}
          </span>
        )}
      </div>

      <div
        className={`min-h-[200px] rounded-lg border p-2 transition-all
          ${isDragOver
            ? 'bg-[var(--burnt-orange)]/10 border-[var(--burnt-orange)] border-2'
            : 'bg-muted/20 border-border/20'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label={`${label} stage column`}
      >
        {buyers.map(buyer => (
          <BuyerCard
            key={buyer.id}
            buyer={buyer}
            onClick={onBuyerClick}
            onChangeStage={onChangeStage}
            isDragging={isDragging && draggedBuyerId === buyer.id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', buyer.id)
              onDragStart(buyer.id)
            }}
            onDragEnd={() => {
              // Drag end is handled in parent
            }}
          />
        ))}
      </div>
    </div>
  )
}
