'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  getFlattenedIndustryOptions,
  getFlattenedOptionBySubSector,
  type FlattenedIndustryOption,
} from '@/lib/data/industries'

interface IndustryComboboxProps {
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
  triggerId?: string
}

export function IndustryCombobox({ value, onSelect, triggerId }: IndustryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Memoize flattened options
  const allOptions = React.useMemo(() => getFlattenedIndustryOptions(), [])

  // Get current selection display
  const selectedOption = value?.icbSubSector
    ? getFlattenedOptionBySubSector(value.icbSubSector)
    : undefined

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return allOptions

    const searchLower = search.toLowerCase()
    return allOptions.filter(
      (option) =>
        option.searchString.includes(searchLower) ||
        option.subSectorLabel.toLowerCase().includes(searchLower) ||
        option.sectorLabel.toLowerCase().includes(searchLower) ||
        option.superSectorLabel.toLowerCase().includes(searchLower) ||
        option.industryLabel.toLowerCase().includes(searchLower)
    )
  }, [allOptions, search])

  // Group filtered options by industry for better organization
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, FlattenedIndustryOption[]> = {}

    for (const option of filteredOptions) {
      if (!groups[option.industryLabel]) {
        groups[option.industryLabel] = []
      }
      groups[option.industryLabel].push(option)
    }

    return groups
  }, [filteredOptions])

  const handleSelect = (option: FlattenedIndustryOption) => {
    onSelect({
      icbIndustry: option.icbIndustry,
      icbSuperSector: option.icbSuperSector,
      icbSector: option.icbSector,
      icbSubSector: option.icbSubSector,
    })
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px] py-2 font-normal"
        >
          {selectedOption ? (
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{selectedOption.subSectorLabel}</span>
              <span className="text-xs text-muted-foreground truncate max-w-full">
                {selectedOption.industryLabel} &gt; {selectedOption.superSectorLabel} &gt; {selectedOption.sectorLabel}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Search or browse industries...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search industries..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No industry found.</CommandEmpty>
            {Object.entries(groupedOptions).map(([industryLabel, options]) => (
              <CommandGroup key={industryLabel} heading={industryLabel}>
                {options.map((option) => (
                  <CommandItem
                    key={option.icbSubSector}
                    value={option.icbSubSector}
                    onSelect={() => handleSelect(option)}
                    className="flex flex-col items-start py-2"
                  >
                    <div className="flex items-center w-full">
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value?.icbSubSector === option.icbSubSector
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{option.subSectorLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.superSectorLabel} &gt; {option.sectorLabel}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
