'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { VISUAL_STAGES } from '@/lib/deal-room/visual-stages'

interface StagePickerDialogProps {
  isOpen: boolean
  onClose: () => void
  buyerName: string
  currentStage: string
  onStageSelect: (visualStage: string) => void
}

export function StagePickerDialog({
  isOpen,
  onClose,
  buyerName,
  currentStage,
  onStageSelect,
}: StagePickerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {buyerName}</DialogTitle>
          <DialogDescription>
            Select a new stage for this buyer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {VISUAL_STAGES.map(stage => {
            const isCurrent = stage.id === currentStage

            return (
              <Button
                key={stage.id}
                variant={isCurrent ? 'secondary' : 'outline'}
                className="justify-start"
                onClick={() => {
                  if (!isCurrent) {
                    onStageSelect(stage.id)
                    onClose()
                  }
                }}
                disabled={isCurrent}
              >
                {stage.label}
                {isCurrent && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Current
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
