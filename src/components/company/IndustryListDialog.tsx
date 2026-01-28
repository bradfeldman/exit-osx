'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { IndustryCombobox } from './IndustryCombobox'

interface IndustryListDialogProps {
  value?: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }
  onSelect: (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => void
}

export function IndustryListDialog({ value, onSelect }: IndustryListDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => {
    onSelect(selection)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-primary hover:text-primary/80 hover:underline focus:outline-none"
        >
          Or select from a predetermined list
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Select Industry Classification</DialogTitle>
          <DialogDescription>
            Search or browse the ICB industry classification list to find the best match for your business.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <IndustryCombobox
            value={value}
            onSelect={handleSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
